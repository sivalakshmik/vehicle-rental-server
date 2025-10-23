
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

/**
 * Send email using Brevo API
 * @param {{ to: string, subject: string, html?: string, text?: string }} options
 */
export async function sendEmail({ to, subject, html = "", text = "" }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL;
  const senderName = process.env.SENDER_NAME;

  if (!apiKey || !senderEmail) {
    console.error("❌ Missing BREVO_API_KEY or SENDER_EMAIL in environment.");
    return false;
  }

  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { email: senderEmail, name: senderName || "Vehicle Rental" },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text || html.replace(/<[^>]+>/g, ""), // fallback plain text
      },
      {
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("📧 Email sent successfully via Brevo →", to);
    return response.data;
  } catch (err) {
    console.error("❌ Brevo send error:", err.response?.data || err.message);
    return false;
  }
}

export default sendEmail;
