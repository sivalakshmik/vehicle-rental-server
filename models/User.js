import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false }, // For admin role
}, { timestamps: true });

//  Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); //  Fixed logical inversion
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

//  Compare entered password with stored one
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
