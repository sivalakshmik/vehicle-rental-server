import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: true,
    trim: true,
  },
  approved: {
    type: Boolean,
    default: false, // For moderation
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Review", reviewSchema);
