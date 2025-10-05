import express from 'express';
import Booking from '../models/Booking.js';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';
import sendEmail from '../utils/mailer.js';

const router = express.Router();

// 📅 Create booking manually (non-Stripe)
router.post('/', verifyToken, async (req, res) => {
  const { vehicle, startDate, endDate } = req.body;

  try {
    const conflict = await Booking.findOne({
      vehicle,
      startDate: { $lt: new Date(endDate) },
      endDate: { $gt: new Date(startDate) },
      status: { $ne: 'cancelled' } // ✅ allow cancelled slots to be reused
    });

    if (conflict) {
      return res.status(409).json({ message: 'Vehicle already booked for selected dates' });
    }

    const booking = new Booking({
      user: req.userId,
      vehicle,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: 'confirmed' // ✅ default status
    });

    await booking.save();

    const user = await User.findById(req.userId);
    const vehicleData = await Vehicle.findById(vehicle);

    if (user && vehicleData) {
      await sendEmail({
        to: user.email,
        subject: 'Booking Confirmed',
        html: `<p>Your booking for ${vehicleData.make} ${vehicleData.model} is confirmed from ${new Date(startDate).toLocaleString()} to ${new Date(endDate).toLocaleString()}.</p>`
      });
    }

    res.status(201).json(booking);
  } catch (error) {
    console.error('❌ Booking creation failed:', error);
    res.status(500).json({ message: 'Booking failed', error });
  }
});

// 📋 Get user's bookings
router.get('/my', verifyToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.userId })
      .populate('vehicle')
      .populate('payment'); // ✅ show payment info if linked
    res.json(bookings);
  } catch (error) {
    console.error('❌ Failed to fetch bookings:', error);
    res.status(500).json({ message: 'Failed to fetch bookings', error });
  }
});

// ❌ Cancel booking
router.put('/:id/cancel', verifyToken, async (req, res) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { status: 'cancelled' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
  } catch (error) {
    console.error('❌ Cancellation failed:', error);
    res.status(500).json({ message: 'Cancellation failed', error });
  }
});

// 📅 Get booked dates for a vehicle
router.get('/vehicle/:id/booked-dates', async (req, res) => {
  try {
    const bookings = await Booking.find({
      vehicle: req.params.id,
      status: { $ne: 'cancelled' } // ✅ exclude cancelled bookings
    });
    res.json(bookings);
  } catch (error) {
    console.error('❌ Failed to fetch booked dates:', error);
    res.status(500).json({ message: 'Failed to fetch booked dates', error });
  }
});

export default router;
