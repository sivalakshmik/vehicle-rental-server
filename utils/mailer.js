import dotenv from "dotenv";
import SibApiV3Sdk from "sib-api-v3-sdk";

dotenv.config();

/**
 * Send transactional emails using Brevo (Sendinblue)
 */
export async function sendEmail({ to, subject, html, text }) {
  try {
    // ✅ Load API key
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      throw new Error("Missing BREVO_API_KEY in environment variables");
    }

    // ✅ Configure Brevo SDK
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    defaultClient.authentications["api-key"].apiKey = apiKey;
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    // ✅ Prepare email details
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = {
      name: process.env.SENDER_NAME || "Vehicle Rental",
      email: process.env.SENDER_EMAIL,
    };
    sendSmtpEmail.to = [{ email: to }];
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.textContent = text || html.replace(/<[^>]+>/g, "");

    // ✅ Send email via Brevo
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log("📧 Brevo email sent successfully →", to);
    return response;
  } catch (err) {
    console.error("❌ Brevo send error:", err.response?.body || err.message);
    throw err;
  }
}

export default sendEmail;
