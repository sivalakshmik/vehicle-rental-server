import mongoose from "mongoose";
import Booking from "../models/Booking.js";

export async function createPendingBooking({ userId, vehicleId, startDate, endDate, ttlMinutes = 30 }) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const overlap = await Booking.findOne({
      vehicle: vehicleId,
      status: { $in: ["pending", "confirmed"] },
      startDate: { $lt: new Date(endDate) },
      endDate: { $gt: new Date(startDate) },
    }).session(session);

    if (overlap) {
      await session.abortTransaction();
      session.endSession();
      return { success: false, reason: "overlap" };
    }

    const expireAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const booking = await Booking.create(
      [
        {
          user: userId,
          vehicle: vehicleId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: "pending",
          expireAt,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();
    return { success: true, booking: booking[0] };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}
