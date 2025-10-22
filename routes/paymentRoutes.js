import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";

import { verifyToken } from "../middleware/authMiddleware.js";
import Vehicle from "../models/Vehicle.js";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import { sendEmail } from "../utils/mailer.js";

dotenv.config();

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-09-30.clover",
});

/* ------------------------------------------------------------------
 🎯 1️⃣ Create Stripe Checkout Session
------------------------------------------------------------------ */
router.post("/create-session", verifyToken, async (req, res) => {
  const { vehicleId, startDate, endDate } = req.body;

  try {
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
    };

    console.log("🔐 Authenticated user ID:", req.userId);
    console.log("📦 Sending metadata to Stripe:", metadata);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency: "inr",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: { name: `${vehicle.make} ${vehicle.model} Rental` },
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

/* ------------------------------------------------------------------
 📦 2️⃣ Stripe Webhook Handler
------------------------------------------------------------------ */
export const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, // raw body buffer
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log("✅ Webhook verified:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { userId, vehicleId, startDate, endDate } = session.metadata || {};
    console.log("📦 Metadata received:", session.metadata);

    if (!userId || !vehicleId) {
      console.error("❌ Missing metadata in session");
      return res.status(400).send("Missing metadata");
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const vehicleObjectId = new mongoose.Types.ObjectId(vehicleId);

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

      const booking = await Booking.create({
        user: userObjectId,
        vehicle: vehicleObjectId,
        startDate,
        endDate,
        payment: payment._id,
        status: "confirmed",
      });

      console.log("✅ Booking created:", booking._id);

      const user = await User.findById(userObjectId);
      const vehicle = await Vehicle.findById(vehicleObjectId);
      if (user && vehicle) {
        await sendEmail({
          to: user.email,
          subject: "Booking Confirmed - Vehicle Rental",
          html: `
            <h3>Hi ${user.name || "Customer"},</h3>
            <p>Your booking for <b>${vehicle.make} ${vehicle.model}</b> is confirmed!</p>
            <p>From: ${new Date(startDate).toLocaleDateString()}<br>
               To: ${new Date(endDate).toLocaleDateString()}</p>
            <p>Amount Paid: ₹${(session.amount_total || 0) / 100}</p>
          `,
        });
        console.log("📧 Confirmation email sent to:", user.email);
      }
    } catch (err) {
      console.error("❌ Error saving booking or payment:", err);
    }
  }

  res.status(200).send("Webhook received");
};

/* ------------------------------------------------------------------
 🧾 3️⃣ Get User Payments
------------------------------------------------------------------ */
router.get("/my", verifyToken, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.userId }).populate("vehicle");
    res.json(payments);
  } catch (error) {
    console.error("❌ Failed to fetch payments:", error);
    res.status(500).json({ message: "Unable to retrieve payment history" });
  }
});



/* -------------------------------------------
 📄 Generate PDF Invoice
------------------------------------------- */
router.get("/invoice/:paymentId", verifyToken, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId).populate("vehicle");
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    const booking = await Booking.findOne({ payment: payment._id }).populate(
      "vehicle user"
    );
    if (!booking)
      return res
        .status(404)
        .json({ message: "Booking not found for this payment" });

    const vehicle = booking.vehicle;
    const user = booking.user;

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=invoice-${payment._id}.pdf`
    );
    doc.pipe(res);

    doc.rect(0, 0, 612, 80).fill("#2563eb");
    doc.fillColor("#fff").fontSize(22).text("Vehicle Rental Pvt. Ltd.", 40, 30);
    doc.fontSize(10).text("123 Main Street, Chennai, India", 40, 55);
    doc.text("Email: support@vehiclerental.com", 40, 68);

    doc.fillColor("#000").fontSize(20).text("INVOICE", { align: "right" }).moveDown(1.5);

    doc.roundedRect(40, 100, 532, 100, 10).strokeColor("#2563eb").stroke();
    doc
      .fontSize(12)
      .fillColor("#000")
      .text(`Invoice ID: ${payment._id}`, 60, 115)
      .text(`Date: ${new Date(payment.createdAt).toLocaleDateString()}`, 60, 135)
      .text(`Payment Status: ${payment.status}`, 60, 155);

    doc.fontSize(14).fillColor("#2563eb").text("Billed To:", 40, 220);
    doc
      .fontSize(12)
      .fillColor("#000")
      .text(user?.name || "Customer Name", 60, 240)
      .text(user?.email || "Customer Email", 60, 255);

    doc.fontSize(14).fillColor("#2563eb").text("Vehicle Details:", 40, 290);
    doc
      .fontSize(12)
      .fillColor("#000")
      .text(`Make & Model: ${vehicle?.make} ${vehicle?.model}`, 60, 310)
      .text(`Year: ${vehicle?.year || "N/A"}`, 60, 325)
      .text(`Type: ${vehicle?.type || "N/A"}`, 60, 340)
      .text(`Price per Day: ₹${vehicle?.pricePerDay}`, 60, 355);

    const days =
      Math.ceil(
        (new Date(booking.endDate) - new Date(booking.startDate)) /
          (1000 * 60 * 60 * 24)
      ) || 1;
    const baseAmount = vehicle.pricePerDay * days;
    const tax = baseAmount * 0.05;
    const totalAmount = baseAmount + tax;

    doc
      .rect(60, 470, 480, 25)
      .fill("#2563eb")
      .fillColor("#fff")
      .fontSize(12)
      .text("Description", 70, 476)
      .text("Days", 270, 476)
      .text("Rate", 340, 476)
      .text("Amount", 440, 476);

    doc
      .fillColor("#000")
      .rect(60, 495, 480, 25)
      .stroke()
      .text(`${vehicle.make} ${vehicle.model}`, 70, 502)
      .text(days.toString(), 280, 502)
      .text(`₹${vehicle.pricePerDay}`, 340, 502)
      .text(`₹${baseAmount}`, 440, 502);

    doc
      .rect(60, 520, 480, 25)
      .stroke()
      .text("GST (5%)", 70, 527)
      .text("-", 280, 527)
      .text("-", 340, 527)
      .text(`₹${tax.toFixed(2)}`, 440, 527);

    doc
      .rect(60, 545, 480, 25)
      .fill("#2563eb")
      .fillColor("#fff")
      .text("Total Payable", 70, 552)
      .text("-", 280, 552)
      .text("-", 340, 552)
      .text(`₹${totalAmount.toFixed(2)}`, 440, 552);

    doc
      .fillColor("#2563eb")
      .fontSize(14)
      .text("Thank you for choosing Vehicle Rental!", 0, 630, { align: "center" });
    doc
      .fontSize(10)
      .fillColor("#666")
      .text("Drive Safe. Visit us again soon!", 0, 650, { align: "center" });

    doc.end();
  } catch (error) {
    console.error("❌ Invoice generation failed:", error);
    res.status(500).json({ message: "Failed to generate invoice" });
  }
});

export default router;

