import express from "express";
import Vehicle from "../models/Vehicle.js";
import Booking from "../models/Booking.js";

const router = express.Router();

// ✅ GET /api/vehicles — List, Filter & Include Booked Dates
router.get("/", async (req, res) => {
  const { type, location, minPrice, maxPrice, keyword } = req.query;

  const query = {};

  if (type?.trim()) query.type = type;
  if (location?.trim()) query.location = location;

  // 💰 Price range filter
  if (minPrice || maxPrice) {
    query.pricePerDay = {};
    if (minPrice) query.pricePerDay.$gte = Number(minPrice);
    if (maxPrice) query.pricePerDay.$lte = Number(maxPrice);
  }

  // 🔍 Keyword search (make/model)
  if (keyword?.trim()) {
    query.$or = [
      { make: { $regex: keyword, $options: "i" } },
      { model: { $regex: keyword, $options: "i" } },
    ];
  }

  try {
    // Step 1️⃣ — Get all matching vehicles
    const vehicles = await Vehicle.find(query).lean();

    // Step 2️⃣ — Fetch active (non-cancelled) bookings
    const bookings = await Booking.find({
      status: { $ne: "cancelled" },
    }).lean();

    // Step 3️⃣ — Group bookings by vehicle
    const vehicleBookings = {};
    bookings.forEach((b) => {
      if (!vehicleBookings[b.vehicle]) vehicleBookings[b.vehicle] = [];
      vehicleBookings[b.vehicle].push({
        start: b.startDate,
        end: b.endDate,
      });
    });

    // Step 4️⃣ — Attach bookedDates to each vehicle
    const result = vehicles.map((v) => ({
      ...v,
      bookedDates: vehicleBookings[v._id] || [],
    }));

    res.json(result);
  } catch (err) {
    console.error("❌ Vehicle fetch error:", err);
    res.status(500).json({ message: "Server error fetching vehicles" });
  }
});

// ✅ POST /api/vehicles — Add a new vehicle (admin use)
router.post("/", async (req, res) => {
  const {
    make,
    model,
    year,
    type,
    location,
    pricePerDay,
    available,
    imageUrl,
    description,
  } = req.body;

  try {
    const newVehicle = new Vehicle({
      make,
      model,
      year,
      type,
      location,
      pricePerDay,
      available,
      imageUrl,
      description,
    });

    const saved = await newVehicle.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("❌ Vehicle creation error:", err);
    res.status(500).json({ message: "Failed to add vehicle" });
  }
});

export default router;
