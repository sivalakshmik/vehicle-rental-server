// server/routes/vehicleRoutes.js
import express from "express";
import Vehicle from "../models/Vehicle.js";
import Booking from "../models/Booking.js";

const router = express.Router();

/* -------------------------------------------
 🚗 GET /api/vehicles — Search + Filter + Include Booked Dates
------------------------------------------- */
router.get("/", async (req, res) => {
  const { type, location, minPrice, maxPrice, keyword } = req.query;

  const query = {};


 // 🚘 Filter by vehicle type (Car, Bike, Scooty, etc.)
if (type?.trim()) {
  query.type = { $regex: `^${type.trim()}$`, $options: "i" };
}


  // 📍 Filter by location (e.g., Madurai, Chennai)
  if (location?.trim()) {
    query.location = { $regex: location.trim(), $options: "i" };
  }

  // 💰 Filter by price range
  if (minPrice || maxPrice) {
    query.pricePerDay = {};
    if (minPrice) query.pricePerDay.$gte = Number(minPrice);
    if (maxPrice) query.pricePerDay.$lte = Number(maxPrice);
  }

  // 🔍 Keyword search (make, model, or type)
  if (keyword?.trim()) {
    const keywordRegex = { $regex: keyword.trim(), $options: "i" };
    query.$or = [
      { make: keywordRegex },
      { model: keywordRegex },
      { type: keywordRegex }, // ✅ added this for "scooty" search
    ];
  }

  try {
    // Step 1️⃣ — Get all matching vehicles
    const vehicles = await Vehicle.find(query).sort({ createdAt: -1 }).lean();

    // Step 2️⃣ — Fetch active (non-cancelled) bookings
    const bookings = await Booking.find({ status: { $ne: "cancelled" } }).lean();

    // Step 3️⃣ — Group bookings by vehicle
    const vehicleBookings = {};
    bookings.forEach((b) => {
      const id = b.vehicle?.toString();
      if (!vehicleBookings[id]) vehicleBookings[id] = [];
      vehicleBookings[id].push({
        startDate: b.startDate,
        endDate: b.endDate,
      });
    });

    // Step 4️⃣ — Attach bookedDates to each vehicle
    const result = vehicles.map((v) => ({
      ...v,
      bookedDates: vehicleBookings[v._id?.toString()] || [],
    }));

    res.status(200).json(result);
  } catch (err) {
    console.error("❌ Vehicle fetch error:", err);
    res.status(500).json({ message: "Failed to fetch vehicles" });
  }
});

/* -------------------------------------------
 🧩 POST /api/vehicles — Add a new vehicle (Admin only)
------------------------------------------- */
router.post("/", async (req, res) => {
  try {
    const newVehicle = new Vehicle(req.body);
    const saved = await newVehicle.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error("❌ Vehicle creation error:", err);
    res.status(500).json({ message: "Failed to add vehicle" });
  }
});

export default router;

