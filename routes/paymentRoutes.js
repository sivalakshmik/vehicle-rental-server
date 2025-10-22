import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";

// ✅ Import all routes normally
import userRoutes from "./routes/userRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Stripe Webhook Route — must handle RAW body BEFORE json()
app.post(
  "/api/payments/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const { default: paymentRouter } = await import("./routes/paymentRoutes.js");
      // Call the exported webhook handler directly
      paymentRouter.handleWebhook(req, res);
    } catch (err) {
      console.error("❌ Error handling webhook:", err);
      res.status(500).send("Internal webhook error");
    }
  }
);

// ✅ All other routes use JSON parser
app.use(express.json());

// ✅ CORS setup
app.use(
  cors({
    origin: [
      "https://kvsvehiclerental.netlify.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    credentials: true,
  })
);

// ✅ Mount your API routes (keep order)
app.use("/api/users", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reviews", reviewRoutes);

// ✅ Serve static files
app.use("/assets", express.static(path.join(__dirname, "assets")));

// ✅ Root route (Render health check)
app.get("/", (req, res) => {
  res.send("✅ Vehicle Rental API is live on Render!");
});

// ✅ MongoDB connection
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
