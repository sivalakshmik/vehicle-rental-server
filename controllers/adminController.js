import Vehicle from '../models/Vehicle.js';
import Booking from '../models/Booking.js';
import User from '../models/User.js';

// Upload a new vehicle (image handled via multer or Cloudinary)
export const uploadVehicle = async (req, res) => {
  try {
    const vehicle = new Vehicle({
      ...req.body,
      image: req.file?.path || req.body.image, // supports file or URL
    });
    await vehicle.save();
    res.status(201).json({ message: '✅ Vehicle uploaded', vehicle });
  } catch (err) {
    res.status(500).json({ message: '❌ Upload failed', error: err.message });
  }
};

// View all bookings
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().populate('user vehicle');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: '❌ Failed to fetch bookings', error: err.message });
  }
};

// Promote user to admin
export const promoteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isAdmin: true }, { new: true });
    res.json({ message: '✅ User promoted to admin', user });
  } catch (err) {
    res.status(500).json({ message: '❌ Promotion failed', error: err.message });
  }
};
