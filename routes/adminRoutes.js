import express from "express";
import { verifyToken, isAdmin } from "../middleware/authMiddleware.js";
import User from "../models/User.js";
import Vehicle from "../models/Vehicle.js";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import Review from "../models/Review.js";

const router = express.Router();

/* -------------------------------------------
 🧮 ADMIN DASHBOARD ANALYTICS
------------------------------------------- */
router.get("/dashboard", verifyToken, isAdmin, async (req, res) => {
  try {
    const [totalUsers, totalVehicles, totalBookings, revenueAgg] = await Promise.all([
      User.countDocuments(),
      Vehicle.countDocuments(),
      Booking.countDocuments(),
      Payment.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
    ]);

    const totalRevenue = revenueAgg[0]?.total / 100 || 0; // convert from paise → ₹

    res.json({
      totalUsers,
      totalVehicles,
      totalBookings,
      totalRevenue,
    });
  } catch (error) {
    console.error("❌ Admin dashboard error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
});

/* -------------------------------------------
 👥 USERS MANAGEMENT
------------------------------------------- */
router.get("/users", verifyToken, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("❌ Users fetch error:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

/* -------------------------------------------
 🚗 VEHICLES MANAGEMENT
------------------------------------------- */
router.get("/vehicles", verifyToken, isAdmin, async (req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (error) {
    console.error("❌ Vehicles fetch error:", error);
    res.status(500).json({ message: "Failed to fetch vehicles" });
  }
});

/* -------------------------------------------
 📅 BOOKINGS MANAGEMENT
------------------------------------------- */
router.get("/bookings", verifyToken, isAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user", "name email")
      .populate("vehicle", "make model location")
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error("❌ Bookings fetch error:", error);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

/* -------------------------------------------
 💬 REVIEWS MODERATION (NEW)
------------------------------------------- */

// 🧾 Get pending reviews (for moderation)
router.get("/reviews/pending", verifyToken, isAdmin, async (req, res) => {
  try {
    const reviews = await Review.find({ approved: false })
      .populate("user", "name email")
      .populate("vehicle", "make model");
    res.json(reviews);
  } catch (error) {
    console.error("❌ Pending reviews fetch error:", error);
    res.status(500).json({ message: "Failed to fetch pending reviews" });
  }
});

// ⚙️ Approve or reject review
router.put("/reviews/:id/moderate", verifyToken, isAdmin, async (req, res) => {
  try {
    const { approved } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });

    review.approved = approved;
    await review.save();

    res.json({
      message: approved ? "Review approved" : "Review rejected",
      review,
    });
  } catch (error) {
    console.error("❌ Review moderation error:", error);
    res.status(500).json({ message: "Failed to moderate review" });
  }
});

export default router;
