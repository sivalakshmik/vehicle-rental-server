// utils/mailer.js
import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";
dotenv.config();

/**
 * Send email using SendGrid API
 * @param {{ to: string, subject: string, text?: string, html?: string }} options
 */
export async function sendMail({ to, subject, text = "", html = "" }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from = process.env.SMTP_FROM;

  if (!apiKey || !from) {
    console.error("❌ Missing SENDGRID_API_KEY or SMTP_FROM in environment.");
    return false;
  }

  sgMail.setApiKey(apiKey);

  const msg = {
    to,
    from, // must be verified sender
    subject,
    text,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log("📧 Email sent successfully via SendGrid →", to);
    return true;
  } catch (err) {
    console.error("❌ SendGrid error:", err.response?.body || err.message);
    return false;
  }
}

export default sendMail;
