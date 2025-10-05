import express from 'express';
import Stripe from 'stripe';
import { verifyToken } from '../middleware/authMiddleware.js';
import Vehicle from '../models/Vehicle.js';
import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import stripe from '../utils/stripeClient.js';
import PDFDocument from 'pdfkit';

const router = express.Router();
const stripeWebhook = new Stripe(process.env.STRIPE_SECRET_KEY);

// 🎯 Create Stripe Checkout Session
router.post('/create-session', verifyToken, async (req, res) => {
  const { vehicleId, startDate, endDate } = req.body;
  console.log('📤 Creating Stripe session for:', { vehicleId, startDate, endDate });

  try {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      console.warn('🚫 Vehicle not found:', vehicleId);
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    const amount = vehicle.pricePerDay * days * 100;
    console.log(`💰 Calculated amount: ₹${amount / 100} for ${days} days`);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'inr',
          product_data: {
            name: `${vehicle.make} ${vehicle.model} Rental`
          },
          unit_amount: amount
        },
        quantity: 1
      }],
      mode: 'payment',
      metadata: {
        userId: req.userId,
        vehicleId,
        startDate,
        endDate
      },
      success_url: `${process.env.CLIENT_URL}/payment-success`,
      cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`
    });

    console.log('✅ Stripe session created:', session.id);
    res.json({ url: session.url });
  } catch (error) {
    console.error('❌ Stripe session error:', error);
    res.status(500).json({ message: 'Failed to create payment session' });
  }
});

// 🔁 Stripe Webhook Listener
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripeWebhook.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('❌ Webhook verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('📦 Webhook received:', event.type);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('🔍 Full session object:', session);
    console.log('🔍 Metadata:', session.metadata);

    const { userId, vehicleId, startDate, endDate } = session.metadata || {};

    if (!userId || !vehicleId) {
      console.warn('⚠️ Missing metadata in session:', session.id);
      return res.status(400).send('Missing metadata');
    }

    try {
      const payment = new Payment({
        user: userId,
        vehicle: vehicleId,
        amount: session.amount_total || 0,
        currency: session.currency || 'inr',
        status: 'completed',
        sessionId: session.id,
        startDate,
        endDate
      });

      await payment.save();
      console.log('✅ Payment saved:', payment);

      const overlap = await Booking.findOne({
        vehicle: vehicleId,
        $or: [
          { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } }
        ]
      });

      if (overlap) {
        console.warn('⚠️ Overlapping booking detected for vehicle:', vehicleId);
        return res.status(200).end();
      }

      const booking = await Booking.create({
        user: userId,
        vehicle: vehicleId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        payment: payment._id
      });

      console.log('✅ Booking created:', booking);
    } catch (err) {
      console.error('❌ Error saving payment or booking:', err.message);
    }
  }

  res.status(200).end();
});

// 📋 Get User Payment History
router.get('/my', verifyToken, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.userId }).populate('vehicle');
    res.json(payments);
  } catch (error) {
    console.error('❌ Failed to fetch payments:', error);
    res.status(500).json({ message: 'Unable to retrieve payment history' });
  }
});

// 📄 Generate PDF Invoice
router.get('/invoice/:paymentId', verifyToken, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId).populate('vehicle');
    if (!payment || payment.user.toString() !== req.userId) {
      return res.status(403).json({ message: 'Unauthorized or payment not found' });
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=invoice-${payment._id}.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text('Vehicle Rental Invoice', { align: 'center' }).moveDown();
    doc.fontSize(12).text(`Invoice ID: ${payment._id}`);
    doc.text(`Date: ${new Date(payment.createdAt).toLocaleDateString()}`);
    doc.text(`User ID: ${payment.user}`);
    doc.text(`Vehicle: ${payment.vehicle.make} ${payment.vehicle.model}`);
    doc.text(`Rental Period: ${payment.startDate} to ${payment.endDate}`);
    doc.text(`Amount Paid: ₹${payment.amount / 100}`);
    doc.text(`Status: ${payment.status}`);
    doc.text(`Stripe Transaction ID: ${payment.sessionId}`);

    doc.end();
  } catch (error) {
    console.error('❌ Invoice generation failed:', error);
    res.status(500).json({ message: 'Unable to generate invoice' });
  }
});

export default router;
