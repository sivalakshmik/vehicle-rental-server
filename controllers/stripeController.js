import stripe from '../utils/stripeClient.js';
import Vehicle from '../models/Vehicle.js';

export const createSession = async (req, res) => {
  const { vehicleId, startDate, endDate } = req.body;

  try {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

    const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    const amount = vehicle.pricePerDay * days * 100;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'inr',
          product_data: { name: `${vehicle.make} ${vehicle.model} Rental` },
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

    res.json({ url: session.url });
  } catch (error) {
    console.error('❌ Stripe session error:', error);
    res.status(500).json({ message: 'Failed to create payment session' });
  }
};
