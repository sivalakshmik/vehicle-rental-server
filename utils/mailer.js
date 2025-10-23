import Brevo from "@getbrevo/brevo";
import dotenv from "dotenv";
dotenv.config();

const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

export async function sendEmail({ to, subject, html }) {
  const sender = {
    email: process.env.SENDER_EMAIL,
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
  } catch (error) {
    console.error("❌ Brevo send error:", error.message || error);
  }
}
