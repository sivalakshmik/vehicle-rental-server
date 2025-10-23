import dotenv from "dotenv";
import Brevo from "@getbrevo/brevo";
dotenv.config();

// Initialize Brevo
const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

/**
 * Send email via Brevo
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 */
export async function sendEmail({ to, subject, html }) {
  const sender = {
    email: process.env.SENDER_EMAIL || "soniakv.2822@gmail.com",
    name: process.env.SENDER_NAME || "Vehicle Rental",
  };

  const emailData = {
    sender,
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };

  try {
    await apiInstance.sendTransacEmail(emailData);
    console.log("📧 Email sent successfully via Brevo →", to);
    return true;
  } catch (error) {
    console.error("❌ Brevo send error:", error.message || error);
    return false;
  }
}

