import dotenv from "dotenv";
import { Resend } from "resend";

// 🧩 Load environment variables
dotenv.config();

// ✅ Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// 🧠 Verify Resend setup on startup
(async () => {
  try {
    const domains = await resend.domains.list();
    console.log("✅ Mailer connected successfully (Resend API)");
  } catch (error) {
    console.error("❌ Mailer connection error:", error.message);
    console.log("⚙️ Debug Info:", {
      RESEND_API_KEY: process.env.RESEND_API_KEY ? "✅ Loaded" : "❌ Missing",
    });
  }
})();

/**
 * 📧 Send an email using Resend (Render-safe)
 * @param {Object} options
 * @param {string} options.to - recipient email
 * @param {string} options.subject - email subject
 * @param {string} [options.text] - plain text body
 * @param {string} [options.html] - HTML body
 */
export async function sendMail({ to, subject, text, html }) {
  try {
    const fromAddress =
      process.env.SMTP_FROM || "KVS Vehicle Rental <onboarding@resend.dev>";

    const data = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });

    console.log(`📨 Email sent successfully → ${to} | Message ID: ${data.id}`);
    return true;
  } catch (error) {
    console.error("❌ Email send error:", error.message);
    if (error.response) console.error("📩 Resend API Response:", error.response);
    return false;
  }
}

// 🔁 Compatibility export
export const sendEmail = sendMail;
export default resend;
