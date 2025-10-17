import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  make: String,
  model: String,
  year: Number,
  type: String,
  location: String,
  pricePerDay: Number,
  available: Boolean,
  imageUrl: String,
  description: String
});

export default mongoose.model('Vehicle', vehicleSchema);
