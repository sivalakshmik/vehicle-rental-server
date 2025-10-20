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

// ⚠️ Stripe webhook must handle raw body before JSON parsing
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), (req, res, next) => {
  next();
});

// ✅ Proper CORS setup
app.use(
  cors({
    origin: [
      "https://lighthearted-llama-3a8643.netlify.app", // Netlify prod
      /\.netlify\.app$/,                              // Preview builds
      "http://localhost:5173",                        // Local dev
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ✅ Middlewares
app.use(express.json());
app.use("/assets", express.static(path.join(__dirname, "assets")));

// ✅ Root route (for testing Render deployment)
app.get("/", (req, res) => {
  res.send("✅ Vehicle Rental API is running successfully on Render!");
});

// ✅ API Routes
app.use("/api/users", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    dbName: "VehiclerentalDB", // ✅ Force the correct database
  })
  .then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}`);
    });
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));



