import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMail({ to, subject, html }) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("❌ Missing RESEND_API_KEY in environment");
      return;
    }

    const from = process.env.SMTP_FROM || "Vehicle Rental <noreply@vehiclerental.com>";

    const response = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (response.error) throw response.error;
    console.log("📧 Email sent successfully via Resend →", to);
  } catch (err) {
    console.error("❌ Resend error:", err);
  }
}

// 👇 Add this line to fix “no default export” error
export default sendMail;
