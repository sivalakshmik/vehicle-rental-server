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
app.use("/api/payments", (req, res, next) => {
  if (req.originalUrl === "/api/payments/webhook") {
    express.raw({ type: "application/json" })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
}, paymentRoutes);

// ✅ Proper CORS setup


const allowedOrigins = [
  "https://kvsvehiclerental.netlify.app", // ✅ your frontend
  "http://localhost:3000",                // ✅ for local dev
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // ✅ if you're sending cookies or auth headers
  })
);

// ✅ Handle preflight requests
app.options("*", cors());
app.use(cors({ ... }));
app.use(express.json());
app.use("/api/...", yourRoutes);


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







