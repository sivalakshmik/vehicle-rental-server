import express from "express";
import Review from "../models/Review.js";
import Booking from "../models/Booking.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* -------------------------------------------
   ✅ Create a Review (only if booked)
------------------------------------------- */
router.post("/:vehicleId", verifyToken, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({ message: "Rating and comment are required." });
    }

    // ✅ Ensure the user has booked the vehicle
    const hasBooking = await Booking.findOne({
      user: req.userId,
      vehicle: vehicleId,
      status: { $in: ["confirmed", "completed"] },
    });

    if (!hasBooking) {
      return res.status(403).json({
        message: "You can only review vehicles you have booked.",
      });
    }

    // ❌ Prevent duplicate review
    const alreadyReviewed = await Review.findOne({ user: req.userId, vehicle: vehicleId });
    if (alreadyReviewed) {
      return res.status(400).json({ message: "You have already reviewed this vehicle." });
    }

    // ✅ Create the review
    const review = await Review.create({
      user: req.userId,
      vehicle: vehicleId,
      rating,
      comment,
    });

    res.status(201).json({ message: "Review submitted successfully.", review });
  } catch (error) {
    console.error("❌ Review submission error:", error);
    res.status(500).json({ message: "Failed to submit review." });
  }
});

/* -------------------------------------------
   🚗 Get all reviews for a vehicle
------------------------------------------- */
router.get("/vehicle/:vehicleId", async (req, res) => {
  try {
    const reviews = await Review.find({ vehicle: req.params.vehicleId })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error("❌ Fetch reviews error:", error);
    res.status(500).json({ message: "Failed to fetch reviews." });
  }
});

export default router;
