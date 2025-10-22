import express from "express";
import Booking from "../models/Booking.js";
import Vehicle from "../models/Vehicle.js";
import User from "../models/User.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { createPendingBooking } from "../utils/bookingService.js";
import  sendEmail  from "../utils/mailer.js";

const router = express.Router();

/* -------------------------------------------
   🆕 1️⃣ Create a pending booking (before payment)
------------------------------------------- */
router.post("/create-pending", verifyToken, async (req, res) => {
  try {
    const { vehicleId, startDate, endDate } = req.body;

    if (!vehicleId || !startDate || !endDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Use utility to block slot temporarily
    const result = await createPendingBooking({
      userId: req.userId,
      vehicleId,
      startDate,
      endDate,
      ttlMinutes: 30, // expires in 30 minutes if not confirmed
    });

    if (!result.success) {
      return res.status(409).json({ message: "Vehicle already booked" });
    }

    return res.status(201).json({ booking: result.booking });
  } catch (error) {
    console.error("❌ Booking creation error:", error);
    res.status(500).json({ message: "Failed to create booking" });
  }
});

/* -------------------------------------------
   ✅ 2️⃣ Create confirmed booking manually (non-Stripe)
   This route instantly confirms booking and sends email
------------------------------------------- */
router.post("/", verifyToken, async (req, res) => {
  try {
    const { vehicleId, startDate, endDate } = req.body;

    if (!vehicleId || !startDate || !endDate) {
      return res.status(400).json({ message: "Missing fields" });
    }

    // 🚫 Prevent overlapping confirmed bookings
    const conflict = await Booking.findOne({
      vehicle: vehicleId,
      startDate: { $lt: new Date(endDate) },
      endDate: { $gt: new Date(startDate) },
      status: { $ne: "cancelled" },
    });

    if (conflict) {
      return res.status(409).json({
        message: "Vehicle already booked for selected dates",
      });
    }

    const booking = await Booking.create({
      user: req.userId,
      vehicle: vehicleId,
      startDate,
      endDate,
      status: "confirmed",
    });

    // Fetch user + vehicle for email content
    const user = await User.findById(req.userId);
    const vehicle = await Vehicle.findById(vehicleId);

    if (user && vehicle) {
      const html = `
        <h2>Booking Confirmed ✅</h2>
        <p>Dear ${user.name || user.email},</p>
        <p>Your booking for <strong>${vehicle.make} ${vehicle.model}</strong> has been confirmed.</p>
        <ul>
          <li><strong>From:</strong> ${new Date(startDate).toLocaleString()}</li>
          <li><strong>To:</strong> ${new Date(endDate).toLocaleString()}</li>
          <li><strong>Price per Day:</strong> ₹${vehicle.pricePerDay}</li>
        </ul>
        <p>We’ll send you a reminder 24 hours before your rental starts.</p>
        <p>Thank you for choosing <strong>Vehicle Rental</strong>!</p>
      `;

      // Fire-and-forget email
      sendEmail({
        to: user.email,
        subject: "Booking Confirmed - Vehicle Rental",
        html,
      }).catch((err) =>
        console.error("❌ Failed to send confirmation email:", err.message)
      );
    }

    res.status(201).json({ message: "Booking confirmed", booking });
  } catch (error) {
    console.error("❌ Manual booking error:", error);
    res.status(500).json({ message: "Booking failed" });
  }
});

/* -------------------------------------------
   📋 3️⃣ Get all bookings for the logged-in user (Dashboard)
------------------------------------------- */
router.get("/my", verifyToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.userId })
      .populate("vehicle")
      .populate("payment")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error("❌ Booking fetch error:", error);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

/* -------------------------------------------
   ❌ 4️⃣ Cancel a booking
------------------------------------------- */
router.put("/:bookingId/cancel", verifyToken, async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findOne({
      _id: bookingId,
      user: req.userId,
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({ message: "Booking already cancelled" });
    }

    booking.status = "cancelled";
    await booking.save();

    // Send cancellation email
    const user = await User.findById(req.userId);
    const vehicle = await Vehicle.findById(booking.vehicle);

    if (user && vehicle) {
      const html = `
        <h2>Booking Cancelled ❌</h2>
        <p>Dear ${user.name || user.email},</p>
        <p>Your booking for <strong>${vehicle.make} ${vehicle.model}</strong> 
        from ${new Date(booking.startDate).toLocaleString()} to 
        ${new Date(booking.endDate).toLocaleString()} has been cancelled.</p>
        <p>We hope to see you again soon!</p>
      `;
      sendEmail({
        to: user.email,
        subject: "Booking Cancelled - Vehicle Rental",
        html,
      }).catch((err) =>
        console.error("❌ Failed to send cancellation email:", err.message)
      );
    }

    res.json({ message: "Booking cancelled successfully", booking });
  } catch (error) {
    console.error("❌ Booking cancel error:", error);
    res.status(500).json({ message: "Failed to cancel booking" });
  }
});

/* -------------------------------------------
   🚗 5️⃣ Get booked dates for a vehicle (Calendar)
------------------------------------------- */
router.get("/vehicle/:vehicleId/booked-dates", async (req, res) => {
  try {
    const { vehicleId } = req.params;

    if (!vehicleId || vehicleId.length < 10) {
      return res.status(400).json({ message: "Invalid vehicle ID" });
    }

    const bookings = await Booking.find({
      vehicle: vehicleId,
      status: { $ne: "cancelled" },
    }).select("startDate endDate -_id");

    res.json(bookings);
  } catch (error) {
    console.error("❌ Fetch booked dates error:", error);
    res.status(500).json({ message: "Failed to fetch booked dates" });
  }
});

export default router;

