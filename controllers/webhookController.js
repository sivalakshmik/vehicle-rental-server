import mongoose from 'mongoose';
import Stripe from 'stripe';
import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';

const stripeWebhook = new Stripe(process.env.STRIPE_SECRET_KEY);

export const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  // 🔐 Verify Stripe signature
  try {
    event = stripeWebhook.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Webhook verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('📦 Stripe webhook received:', event.type);

  // 🎯 Handle checkout completion
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, vehicleId, startDate, endDate } = session.metadata || {};

    // 🚨 Validate metadata
    if (!userId || !vehicleId || !startDate || !endDate) {
      console.warn('⚠️ Missing metadata in session:', session.id);
      return res.status(400).send('Missing metadata');
    }

    try {
      // 💳 Save payment
      const payment = await Payment.create({
        user: mongoose.Types.ObjectId(userId),
        vehicle: vehicleId,
        amount: session.amount_total || 0,
        currency: session.currency || 'inr',
        status: 'completed',
        sessionId: session.id,
        startDate,
        endDate
      });

      console.log('✅ Payment saved:', payment._id);

      // 📅 Save booking
      const booking = await Booking.create({
        user: mongoose.Types.ObjectId(userId),
        vehicle: vehicleId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        payment: payment._id,
        status: 'confirmed'
      });

      console.log('✅ Booking created:', booking._id);
    } catch (err) {
      console.error('❌ Error saving payment or booking:', err.message);
      return res.status(500).send('Internal error saving booking');
    }
  }

  res.status(200).end();
};
