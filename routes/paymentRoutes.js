import dotenv from "dotenv";
dotenv.config();

import express from "express";
import Stripe from "stripe";
import PDFDocument from "pdfkit";
import mongoose from "mongoose";

import { verifyToken } from "../middleware/authMiddleware.js";
import Vehicle from "../models/Vehicle.js";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/mailer.js";

const router = express.Router();

// ✅ Stripe Setup
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY missing in .env");
  process.exit(1);
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

console.log("✅ Stripe initialized");

/* ============================================================
 🎯 1️⃣ Create Stripe Checkout Session
============================================================ */
router.post("/create-session", verifyToken, async (req, res) => {
  const { vehicleId, startDate, endDate, bookingId } = req.body;

  try {
    const conflict = await Booking.findOne({
      vehicle: vehicleId,
      startDate: { $lt: new Date(endDate) },
      endDate: { $gt: new Date(startDate) },
      status: { $ne: "cancelled" },
    });

    if (conflict) {
      return res.status(409).json({
        message: "Vehicle already booked for these dates. Choose another slot.",
      });
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    const days = Math.ceil(
      (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
    );
    const amount = vehicle.pricePerDay * days * 100;

    const metadata = {
      userId: req.userId,
      vehicleId,
      startDate,
      endDate,
      bookingId,
    };

    console.log("🔐 Authenticated user ID:", req.userId);
    console.log("📦 Sending metadata to Stripe:", metadata);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: `${vehicle.make} ${vehicle.model} Rental`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      metadata,
      success_url: `${process.env.CLIENT_URL}/payment-success`,
      cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`,
    });

    console.log("✅ Stripe session created:", session.id);
    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe session error:", err.message);
    res.status(500).json({ message: "Failed to create payment session" });
  }
});

/* ============================================================
 🔁 2️⃣ Stripe Webhook Handler (for Render)
============================================================ */

// ✅ This is used by server.js → app.post("/api/payments/webhook", bodyParser.raw(...))
export const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("📦 Webhook received:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { userId, vehicleId, startDate, endDate, bookingId } =
      session.metadata || {};

    console.log("📦 Metadata received:", session.metadata);

    if (!userId || !vehicleId) {
      console.error("❌ Missing userId or vehicleId in metadata");
      return res.status(400).send("Missing required metadata");
    }

    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : undefined;
    const vehicleObjectId = mongoose.Types.ObjectId.isValid(vehicleId)
      ? new mongoose.Types.ObjectId(vehicleId)
      : undefined;

    try {
      const payment = await Payment.create({
        user: userObjectId,
        vehicle: vehicleObjectId,
        amount: session.amount_total || 0,
        currency: session.currency || "inr",
        status: "completed",
        sessionId: session.id,
        startDate,
        endDate,
      });

      let booking;
      if (bookingId) {
        booking = await Booking.findById(bookingId);
        if (booking && booking.status === "pending") {
          booking.status = "confirmed";
          booking.payment = payment._id;
          booking.expireAt = null;
          await booking.save();
          console.log("✅ Pending booking confirmed:", booking._id);
        }
      }

      if (!booking) {
        booking = await Booking.create({
          user: userObjectId,
          vehicle: vehicleObjectId,
          startDate,
          endDate,
          payment: payment._id,
          status: "confirmed",
        });
        console.log("✅ Booking created from webhook:", booking._id);
      }

      // 📧 Send confirmation email
      const user = await User.findById(userObjectId);
      const vehicle = await Vehicle.findById(vehicleObjectId);
      if (user && vehicle) {
        const html = `
          <h2>Booking Confirmed ✅</h2>
          <p>Dear ${user.name || user.email},</p>
          <p>Your booking for <strong>${vehicle.make} ${vehicle.model}</strong> is confirmed.</p>
          <ul>
            <li><strong>From:</strong> ${new Date(startDate).toLocaleString()}</li>
            <li><strong>To:</strong> ${new Date(endDate).toLocaleString()}</li>
            <li><strong>Total Paid:</strong> ₹${payment.amount / 100}</li>
          </ul>
          <p>We’ll send you a reminder 24 hours before your booking starts.</p>
          <p>Thank you for choosing <b>Vehicle Rental!</b></p>
        `;

        await sendEmail({
          to: user.email,
          subject: "Booking Confirmed - Vehicle Rental",
          html,
        });
        console.log("📧 Confirmation email sent to", user.email);
      }
    } catch (error) {
      console.error("❌ Error in webhook handling:", error);
    }
  }

  res.status(200).end();
};

/* ============================================================
 🧾 3️⃣ Get User Payments
============================================================ */
router.get("/my", verifyToken, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.userId }).populate("vehicle");
    res.json(payments);
  } catch (error) {
    console.error("❌ Failed to fetch payments:", error);
    res.status(500).json({ message: "Unable to retrieve payment history" });
  }
});

/* ============================================================
 📄 4️⃣ Generate Styled PDF Invoice
============================================================ */
router.get("/invoice/:paymentId", verifyToken, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId).populate("vehicle");
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    const booking = await Booking.findOne({ payment: payment._id }).populate("vehicle user");
    if (!booking) return res.status(404).json({ message: "Booking not found for this payment" });

    const vehicle = booking.vehicle;
    const user = booking.user;

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=invoice-${payment._id}.pdf`
    );
    doc.pipe(res);

    // Header
    doc.rect(0, 0, 612, 80).fill("#2563eb");
    doc.fillColor("#fff").fontSize(22).text("Vehicle Rental Pvt. Ltd.", 40, 30);
    doc.fontSize(10).text("123 Main Street, Chennai, India", 40, 55);
    doc.text("Email: support@vehiclerental.com", 40, 68);

    // Invoice Title
    doc.fillColor("#000").fontSize(20).text("INVOICE", { align: "right" }).moveDown(1.5);

    // Invoice Details
    doc.roundedRect(40, 100, 532, 100, 10).strokeColor("#2563eb").stroke();
    doc.fontSize(12).fillColor("#000")
      .text(`Invoice ID: ${payment._id}`, 60, 115)
      .text(`Date: ${new Date(payment.createdAt).toLocaleDateString()}`, 60, 135)
      .text(`Payment Status: ${payment.status}`, 60, 155);

    // Customer Info
    doc.fontSize(14).fillColor("#2563eb").text("Billed To:", 40, 220);
    doc.fontSize(12).fillColor("#000")
      .text(user?.name || "Customer Name", 60, 240)
      .text(user?.email || "Customer Email", 60, 255);

    // Vehicle Info
    doc.fontSize(14).fillColor("#2563eb").text("Vehicle Details:", 40, 290);
    doc.fontSize(12).fillColor("#000")
      .text(`Make & Model: ${vehicle?.make} ${vehicle?.model}`, 60, 310)
      .text(`Year: ${vehicle?.year || "N/A"}`, 60, 325)
      .text(`Type: ${vehicle?.type || "N/A"}`, 60, 340)
      .text(`Price per Day: ₹${vehicle?.pricePerDay}`, 60, 355);

    // Booking Duration
    doc.fontSize(14).fillColor("#2563eb").text("Booking Duration:", 40, 400);
    doc.fontSize(12).fillColor("#000")
      .text(`From: ${new Date(booking.startDate).toLocaleDateString()}`, 60, 420)
      .text(`To: ${new Date(booking.endDate).toLocaleDateString()}`, 60, 435);

    // Payment Summary
    const days =
      Math.ceil(
        (new Date(booking.endDate) - new Date(booking.startDate)) /
          (1000 * 60 * 60 * 24)
      ) || 1;
    const baseAmount = vehicle.pricePerDay * days;
    const tax = baseAmount * 0.05;
    const totalAmount = baseAmount + tax;

    doc.rect(60, 470, 480, 25).fill("#2563eb").fillColor("#fff").fontSize(12)
      .text("Description", 70, 476)
      .text("Days", 270, 476)
      .text("Rate", 340, 476)
      .text("Amount", 440, 476);

    doc.fillColor("#000").rect(60, 495, 480, 25).stroke()
      .text(`${vehicle.make} ${vehicle.model}`, 70, 502)
      .text(days.toString(), 280, 502)
      .text(`₹${vehicle.pricePerDay}`, 340, 502)
      .text(`₹${baseAmount}`, 440, 502);

    doc.rect(60, 520, 480, 25).stroke()
      .text("GST (5%)", 70, 527)
      .text("-", 280, 527)
      .text("-", 340, 527)
      .text(`₹${tax.toFixed(2)}`, 440, 527);

    doc.rect(60, 545, 480, 25).fill("#2563eb").fillColor("#fff")
      .text("Total Payable", 70, 552)
      .text("-", 280, 552)
      .text("-", 340, 552)
      .text(`₹${totalAmount.toFixed(2)}`, 440, 552);

    // Footer
    doc.fillColor("#2563eb").fontSize(14).text("Thank you for choosing Vehicle Rental!", 0, 630, { align: "center" });
    doc.fontSize(10).fillColor("#666").text("Drive Safe. Visit us again soon!", 0, 650, { align: "center" });

    doc.end();
  } catch (error) {
    console.error("❌ Invoice generation failed:", error);
    res.status(500).json({ message: "Failed to generate invoice" });
  }
});

export default router;
