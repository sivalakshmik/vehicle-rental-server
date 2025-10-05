import express from 'express';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Vehicle from '../models/Vehicle.js';

const router = express.Router();

// 🛠 Admin dashboard data
router.get('/dashboard', verifyToken, isAdmin , async (req, res) => {
  const users = await User.countDocuments();
  const bookings = await Booking.countDocuments();
  const revenue = await Booking.aggregate([
    {
      $lookup: {
        from: 'vehicles',
        localField: 'vehicleId',
        foreignField: '_id',
        as: 'vehicle',
      },
    },
    { $unwind: '$vehicle' },
    {
      $project: {
        days: {
          $ceil: {
            $divide: [{ $subtract: ['$endDate', '$startDate'] }, 1000 * 60 * 60 * 24],
          },
        },
        pricePerDay: '$vehicle.pricePerDay',
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: { $multiply: ['$days', '$pricePerDay'] } },
      },
    },
  ]);

  res.json({
    totalUsers: users,
    totalBookings: bookings,
    totalRevenue: revenue[0]?.total || 0,
  });
});
export default router;



