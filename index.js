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

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();

// ⚠️ 1️⃣ Stripe webhook must handle raw body before JSON parsing
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), (req, res, next) => {
  next();
});

// ✅ 2️⃣ Then load middlewares
app.use(cors());
app.use(express.json());
app.use("/assets", express.static(path.join(__dirname, "assets")));

// ✅ 3️⃣ Routes
app.use("/api/users", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reviews",reviewRoutes);

// ✅ 4️⃣ Connect MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`✅ Connected to MongoDB: ${mongoose.connection.name}`);
    });
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));
