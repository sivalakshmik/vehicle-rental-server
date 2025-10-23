
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * Send transactional emails using Gmail SMTP
 */
export async function sendEmail({ to, subject, html, text }) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `${process.env.SENDER_NAME || "Vehicle Rental"} <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: text || html.replace(/<[^>]+>/g, ""),
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("📧 Gmail email sent successfully →", to);
    return info;
  } catch (err) {
    console.error("❌ Gmail send error:", err.message);
    throw err;
  }
}

export default sendEmail;
