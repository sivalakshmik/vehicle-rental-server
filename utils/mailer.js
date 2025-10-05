import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async (userEmail, bookingDetails) => {
  try {
    const mailOptions = {
      from: `"Vehicle Rental" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: 'Booking Confirmation',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 10px;">
          <h2 style="color: #2c3e50;">Your Booking is Confirmed</h2>
          <p>${bookingDetails}</p>
          <p>Thank you for choosing our service!</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${userEmail}`);
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
  }
};

export default sendEmail;
