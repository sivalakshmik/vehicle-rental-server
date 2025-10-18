import dotenv from "dotenv";
import nodemailer from "nodemailer";

// 🧩 Ensure environment variables are loaded before anything else
dotenv.config();

// ✅ Create transporter with Gmail or fallback SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// 🧠 Verify transporter at startup
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ Mailer connection error:", err.message);
    console.log("⚙️ Debug Info:", {
      SMTP_USER: process.env.SMTP_USER || "❌ Missing",
      SMTP_PASS: process.env.SMTP_PASS ? "✅ Loaded" : "❌ Missing",
    });
  } else {
    console.log("✅ Mailer connected successfully");
  }
});

/**
 * 📧 Send an email with HTML, text, and optional attachments.
 * @param {Object} options
 * @param {string} options.to - recipient email
 * @param {string} options.subject - email subject
 * @param {string} [options.text] - plain text body
 * @param {string} [options.html] - HTML body
 * @param {Array} [options.attachments] - attachments
 */
export async function sendMail({ to, subject, text, html, attachments }) {
  try {
    const msg = {
      from: process.env.SMTP_FROM || `"Vehicle Rental Pvt. Ltd." <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
      attachments,
    };

    const info = await transporter.sendMail(msg);
    console.log(`📨 Email sent successfully → ${to} | Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error("❌ Email send error:", error.message);
    if (error.response) console.error("📩 SMTP Response:", error.response);
    return false;
  }
}

// 🔁 Compatibility export
export const sendEmail = sendMail;
export default transporter;
