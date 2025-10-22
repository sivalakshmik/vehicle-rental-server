import express from "express";
import PDFDocument from "pdfkit";
import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import sendMail  from "../utils/mailer.js";

const router = express.Router();

router.get("/email/:bookingId", async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.sendStatus(401);

    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    const booking = await Booking.findById(req.params.bookingId).populate("vehicleId");

    if (!booking || booking.userId.toString() !== decoded.id) {
      return res.status(403).send("Unauthorized access to invoice");
    }

    const vehicle = booking.vehicleId;

    // 🧾 Create PDF document
    const doc = new PDFDocument({ margin: 40 });
    const buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", async () => {
      const pdfData = Buffer.concat(buffers);

      // 📧 Send invoice email
      await sendMail({
        to: user.email,
        subject: "Your Vehicle Rental Invoice",
        html: `
          <h2 style="color:#2563eb;">Thank you for your booking!</h2>
          <p>Attached is your detailed vehicle rental invoice.</p>
          <p><b>Booking ID:</b> ${booking._id}</p>
          <p><b>Vehicle:</b> ${vehicle.make} ${vehicle.model}</p>
          <p><b>Rental Dates:</b> ${new Date(booking.startDate).toLocaleDateString()} to ${new Date(booking.endDate).toLocaleDateString()}</p>
          <p><b>Total:</b> ₹${vehicle.pricePerDay * Math.ceil((new Date(booking.endDate) - new Date(booking.startDate)) / (1000 * 60 * 60 * 24))}</p>
        `,
        attachments: [
          { filename: `invoice-${booking._id}.pdf`, content: pdfData },
        ],
      });

      res.send("✅ Invoice emailed successfully!");
    });

    // 🎨 HEADER
    doc.rect(0, 0, 612, 80)
      .fill("#2563eb");
    doc.fillColor("#fff")
      .fontSize(22)
      .text("Vehicle Rental Pvt. Ltd.", 40, 30)
      .fontSize(10)
      .text("123 Main Street, Chennai, India", 40, 55)
      .text("Email: support@vehiclerental.com", 40, 68);

    // 🧾 Invoice title
    doc.fillColor("#000")
      .fontSize(20)
      .text("INVOICE", { align: "right" })
      .moveDown(1.5);

    // 🔹 Invoice Info Box
    doc.roundedRect(40, 100, 532, 90, 10)
      .strokeColor("#2563eb")
      .lineWidth(1)
      .stroke();

    doc.fillColor("#000")
      .fontSize(12)
      .text(`Invoice ID: ${booking._id}`, 60, 115)
      .text(`Date: ${new Date().toLocaleDateString()}`, 60, 135)
      .text(`Payment Status: ${booking.status}`, 60, 155);

    // 👤 Customer Details
    doc.fontSize(14).fillColor("#2563eb").text("Billed To:", 40, 210);
    doc.fontSize(12).fillColor("#000")
      .text(user.name, 60, 230)
      .text(user.email, 60, 245);

    // 🚗 Vehicle Details
    doc.fontSize(14).fillColor("#2563eb").text("Vehicle Details:", 40, 280);
    doc.fontSize(12).fillColor("#000")
      .text(`Make & Model: ${vehicle.make} ${vehicle.model}`, 60, 300)
      .text(`Year: ${vehicle.year || "N/A"}`, 60, 315)
      .text(`Type: ${vehicle.type || "N/A"}`, 60, 330)
      .text(`Location: ${vehicle.location || "N/A"}`, 60, 345)
      .text(`Price per Day: ₹${vehicle.pricePerDay}`, 60, 360);

    // 🗓️ Booking Duration
    doc.fontSize(14).fillColor("#2563eb").text("Booking Duration:", 40, 400);
    doc.fontSize(12).fillColor("#000")
      .text(`From: ${new Date(booking.startDate).toLocaleDateString()}`, 60, 420)
      .text(`To: ${new Date(booking.endDate).toLocaleDateString()}`, 60, 435);

    // 💰 Calculation
    const days = Math.ceil(
      (new Date(booking.endDate) - new Date(booking.startDate)) /
      (1000 * 60 * 60 * 24)
    );
    const baseAmount = vehicle.pricePerDay * days;
    const tax = baseAmount * 0.05;
    const totalAmount = baseAmount + tax;

    const tableTop = 470;
    const left = 60;

    // 🧮 Table
    doc.rect(left, tableTop, 480, 25)
      .fill("#2563eb")
      .fillColor("#fff")
      .fontSize(12)
      .text("Description", left + 10, tableTop + 6)
      .text("Days", left + 230, tableTop + 6)
      .text("Rate", left + 300, tableTop + 6)
      .text("Amount", left + 400, tableTop + 6);

    doc.fillColor("#000")
      .rect(left, tableTop + 25, 480, 25)
      .stroke()
      .text(`${vehicle.make} ${vehicle.model}`, left + 10, tableTop + 32)
      .text(days.toString(), left + 240, tableTop + 32)
      .text(`\u20B9${vehicle.pricePerDay}`, left + 300, tableTop + 32)
      .text(`\u20B9${baseAmount}`, left + 400, tableTop + 32);

    doc.rect(left, tableTop + 50, 480, 25)
      .stroke()
      .text("GST (5%)", left + 10, tableTop + 57)
      .text("-", left + 240, tableTop + 57)
      .text("-", left + 300, tableTop + 57)
      .text(`\u20B9${tax.toFixed(2)}`, left + 400, tableTop + 57);

    doc.rect(left, tableTop + 75, 480, 25)
      .fill("#2563eb")
      .fillColor("#fff")
      .text("Total", left + 10, tableTop + 82)
      .text("-", left + 240, tableTop + 82)
      .text("-", left + 300, tableTop + 82)
      .text(`\u20B9${totalAmount.toFixed(2)}`, left + 400, tableTop + 82);

    // 🪶 Footer
    doc.fillColor("#2563eb")
      .fontSize(14)
      .text("Thank you for choosing KVS Vehicle Rental!", 0, 650, { align: "center" })
      .fontSize(10)
      .fillColor("#666")
      .text("Drive Safe. Visit us again soon!", 0, 670, { align: "center" });

    doc.end();
  } catch (error) {
    console.error("❌ Email invoice error:", error);
    res.status(500).json({ message: "Failed to send invoice email", error: error.message });
  }
});

export default router;

