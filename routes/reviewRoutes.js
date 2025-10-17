import express from "express";
import Review from "../models/Review.js";
import Vehicle from "../models/Vehicle.js";
import { verifyToken,isAdmin } from "../middleware/authMiddleware.js";


const router = express.Router();

/* 📝 Add Review */
router.post("/:vehicleId", verifyToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const vehicleId = req.params.vehicleId;

    // Prevent multiple reviews per booking
    const existing = await Review.findOne({
      vehicle: vehicleId,
      user: req.userId,
    });
    if (existing)
      return res.status(400).json({ message: "You already reviewed this vehicle." });

    const review = new Review({
      vehicle: vehicleId,
      user: req.userId,
      rating,
      comment,
      approved: false, // Admin must approve first
    });

    await review.save();
    res.status(201).json({ message: "Review submitted for moderation." });
  } catch (err) {
    console.error("❌ Review creation failed:", err);
    res.status(500).json({ message: "Failed to post review" });
  }
});

/* 🌟 Get Approved Reviews for a Vehicle */
router.get("/vehicle/:vehicleId", async (req, res) => {
  try {
    const reviews = await Review.find({
      vehicle: req.params.vehicleId,
      approved: true,
    })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    console.error("❌ Fetch reviews failed:", err);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

/* 🧹 Admin: Get All Pending Reviews */
router.get("/pending", verifyToken, isAdmin, async (req, res) => {
  try {
    const reviews = await Review.find({ approved: false })
      .populate("user", "name email")
      .populate("vehicle", "make model");
    res.json(reviews);
  } catch (err) {
    console.error("❌ Fetch pending reviews failed:", err);
    res.status(500).json({ message: "Failed to fetch pending reviews" });
  }
});

/* ✅ Admin: Approve / Reject Review */
router.put("/:reviewId/moderate", verifyToken, isAdmin, async (req, res) => {
  try {
    const { approved } = req.body;
    const review = await Review.findByIdAndUpdate(
      req.params.reviewId,
      { approved },
      { new: true }
    );
    if (!review) return res.status(404).json({ message: "Review not found" });
    res.json(review);
  } catch (err) {
    console.error("❌ Review moderation failed:", err);
    res.status(500).json({ message: "Failed to moderate review" });
  }
});

export default router;
