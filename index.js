import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import userRoutes from "./routes/userRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

/* ✅ 1️⃣ CORS Setup */
app.use(
  cors({
    origin: [
      "https://kvsvehiclerental.netlify.app", // Netlify frontend
      "http://localhost:5173",                // Local frontend (Vite)
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

/* ✅ 2️⃣ Handle Stripe Webhook with raw body (before JSON parser) */
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    // We delegate actual webhook handling to paymentRoutes
    next();
  }
);

/* ✅ 3️⃣ Normal body parsing for all other routes */
app.use(express.json());
app.use("/assets", express.static(path.join(__dirname, "assets")));

/* ✅ 4️⃣ Root health route */
app.get("/", (req, res) => {
  res.send("✅ Vehicle Rental API is running successfully on Render!");
});

/* ✅ 5️⃣ API Routes */
app.use("/api/users", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes); // includes webhook route inside
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);

/* ✅ 6️⃣ MongoDB Connection */
mongoose
  .connect(process.env.MONGO_URI, {
    dbName: "VehiclerentalDB",
  })
  .then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}`);
    });
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));
