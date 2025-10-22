import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import userRoutes from "./routes/userRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import paymentRouter, { handleWebhook } from "./routes/paymentRoutes.js";

dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ------------------------------------------------------------------
 ✅ STRIPE WEBHOOK: RAW BODY FIRST (before express.json!)
------------------------------------------------------------------ */
app.post(
  "/api/payments/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    console.log("📦 Stripe webhook received");
    try {
      await handleWebhook(req, res);
    } catch (err) {
      console.error("❌ Webhook error:", err.message);
      res.status(500).send("Internal webhook error");
    }
  }
);

/* ------------------------------------------------------------------
 ✅ NORMAL JSON MIDDLEWARES (AFTER WEBHOOK!)
------------------------------------------------------------------ */
app.use(express.json());
app.use(cors({
  origin: [
    "https://kvsvehiclerental.netlify.app",
    "http://localhost:3000",
  ],
  credentials: true,
}));

/* ------------------------------------------------------------------
 ✅ API ROUTES
------------------------------------------------------------------ */
app.use("/api/users", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRouter);
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);

app.get("/", (req, res) => {
  res.send("✅ Vehicle Rental API is running successfully!");
});

/* ------------------------------------------------------------------
 ✅ DATABASE CONNECTION
------------------------------------------------------------------ */
mongoose.connect(process.env.MONGO_URI, { dbName: "VehiclerentalDB" })
  .then(() => {
    const PORT = process.env.PORT || 10000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}`);
      console.log(`🔗 Webhook endpoint: /api/payments/webhook`);
    });
  })
  .catch(err => console.error("❌ MongoDB error:", err.message));
