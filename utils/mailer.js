import SibApiV3Sdk from "@sendinblue/client";
import dotenv from "dotenv";
dotenv.config();

const brevo = new SibApiV3Sdk.TransactionalEmailsApi();
brevo.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

/**
 * Send email using Brevo (Sendinblue)
 * @param {{ to: string, subject: string, html?: string, text?: string }} options
 */
export async function sendEmail({ to, subject, html, text }) {
  try {
    const sender = {
      email: process.env.SENDER_EMAIL,
      name: process.env.SENDER_NAME || "Vehicle Rental",
    };

    const mailData = {
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html || "",
      textContent: text || "",
    };

    await brevo.sendTransacEmail(mailData);

    console.log("📧 Email sent successfully via Brevo →", to);
    return true;
  } catch (error) {
    console.error("❌ Brevo send error:", error.message || error);
    return false;
  }
}
