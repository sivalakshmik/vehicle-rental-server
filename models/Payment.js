import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'inr' },
  status: { type: String, enum: ['completed', 'failed'], default: 'completed' },
  sessionId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Payment', paymentSchema);
