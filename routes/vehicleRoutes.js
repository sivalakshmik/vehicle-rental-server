import express from 'express';
import Vehicle from '../models/Vehicle.js';

const router = express.Router();

// GET /api/vehicles — List and filter vehicles
router.get('/', async (req, res) => {
  const { type, location, minPrice, maxPrice, keyword } = req.query;

  const query = {};

  if (type?.trim()) query.type = type;
  if (location?.trim()) query.location = location;

  if (minPrice || maxPrice) {
    query.pricePerDay = {};
    if (minPrice) query.pricePerDay.$gte = Number(minPrice);
    if (maxPrice) query.pricePerDay.$lte = Number(maxPrice);
  }

  if (keyword?.trim()) {
    query.$or = [
      { make: { $regex: keyword, $options: 'i' } },
      { model: { $regex: keyword, $options: 'i' } }
    ];
  }

  try {
    const vehicles = await Vehicle.find(query);
    res.json(vehicles);
  } catch (err) {
    console.error(' Vehicle fetch error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/vehicles — Add a new vehicle (for admin use)
router.post('/', async (req, res) => {
  const {
    make,
    model,
    year,
    type,
    location,
    pricePerDay,
    available,
    imageUrl,
    description
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
      description
    });

    const saved = await newVehicle.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('❌ Vehicle creation error:', err);
    res.status(500).json({ message: 'Failed to add vehicle' });
  }
});

export default router;
