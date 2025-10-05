import express from 'express';
import PDFDocument from 'pdfkit';
import Booking from '../models/Booking.js';
import Vehicle from '../models/Vehicle.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { sendMail } from '../utils/mailer.js';

const router = express.Router();

router.get('/email/:bookingId', async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.sendStatus(401);

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  const booking = await Booking.findById(req.params.bookingId).populate('vehicleId');

  if (!booking || booking.userId.toString() !== decoded.id) {
    return res.status(403).send('Unauthorized');
  }

  const doc = new PDFDocument();
  const buffers = [];

  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', async () => {
    const pdfData = Buffer.concat(buffers);
    await sendMail({
      to: user.email,
      subject: 'Your Vehicle Rental Invoice',
      text: 'Please find your invoice attached.',
      html: `<h2>Invoice for Booking</h2><p>Vehicle: ${booking.vehicleId.make} ${booking.vehicleId.model}</p>`,
      attachments: [{ filename: `invoice-${booking._id}.pdf`, content: pdfData }],
    });
    res.send('Invoice emailed successfully');
  });

  doc.fontSize(20).text('Vehicle Rental Invoice', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Invoice ID: ${booking._id}`);
  doc.text(`Customer: ${user.name} (${user.email})`);
  doc.text(`Vehicle: ${booking.vehicleId.make} ${booking.vehicleId.model}`);
  doc.text(`Rental Period: ${new Date(booking.startDate).toLocaleDateString()} to ${new Date(booking.endDate).toLocaleDateString()}`);
  doc.text(`Price per Day: ₹${booking.vehicleId.pricePerDay}`);
  const days = Math.ceil((new Date(booking.endDate) - new Date(booking.startDate)) / (1000 * 60 * 60 * 24));
  doc.text(`Total Amount: ₹${days * booking.vehicleId.pricePerDay}`);
  doc.text(`Status: ${booking.status}`);
  doc.end();
});

export default router;
