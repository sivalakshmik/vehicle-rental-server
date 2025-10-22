
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";

// 🧩 Import routes
import userRoutes from "./routes/userRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import paymentRouter, { handleWebhook } from "./routes/paymentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

// ✅ Initialize environment
dotenv.config();

const app = express();

// ✅ Setup dirname (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ------------------------------------------------------------------
  1️⃣ STRIPE WEBHOOK — MUST USE RAW BODY BEFORE express.json()
------------------------------------------------------------------ */
app.post(
  "/api/payments/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      console.log("📦 Stripe webhook received");
      await handleWebhook(req, res);
    } catch (err) {
      console.error("❌ Error handling webhook:", err);
      res.status(500).send("Internal webhook error");
    }
  }
);

/* ------------------------------------------------------------------
  2️⃣ NORMAL ROUTES — USE JSON PARSER (AFTER webhook)
------------------------------------------------------------------ */
app.use((req, res, next) => {
  if (req.originalUrl === "/api/payments/webhook") {
    next(); // skip express.json for Stripe
  } else {
    express.json()(req, res, next);
  }
});

/* ------------------------------------------------------------------
  3️⃣ CORS CONFIGURATION
------------------------------------------------------------------ */
app.use(
  cors({
    origin: [
      "https://kvsvehiclerental.netlify.app", // ✅ Your deployed frontend
      "http://localhost:3000",                // ✅ Local dev
    ],
    credentials: true,
  })
);

/* ------------------------------------------------------------------
  4️⃣ STATIC FILES (OPTIONAL)
------------------------------------------------------------------ */
app.use("/assets", express.static(path.join(__dirname, "assets")));

/* ------------------------------------------------------------------
  5️⃣ API ROUTES
------------------------------------------------------------------ */
app.get("/", (req, res) => {
  res.send("✅ Vehicle Rental API is running successfully on Render!");
});

app.use("/api/users", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRouter); // ✅ Includes create-session, etc.
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);

/* ------------------------------------------------------------------
  6️⃣ MONGODB CONNECTION
------------------------------------------------------------------ */
mongoose
  .connect(process.env.MONGO_URI, {
    dbName: "VehiclerentalDB",
  })
  .then(() => {
    const PORT = process.env.PORT || 10000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}`);
      console.log(`🔗 Webhook endpoint: /api/payments/webhook`);
    });
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

export default app;
