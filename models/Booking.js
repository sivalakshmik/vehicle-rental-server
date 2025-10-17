import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },

    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },

    // ✅ Email reminder tracking
    reminderSent: { type: Boolean, default: false },
    reminderSentAt: { type: Date, default: null },

    // ✅ Auto-expire pending bookings (set expireAt only for pending)
    expireAt: { type: Date, default: null },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

// ✅ MongoDB TTL index to auto-remove expired pending bookings
bookingSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Booking", bookingSchema);
