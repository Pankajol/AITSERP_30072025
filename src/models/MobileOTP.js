import mongoose from "mongoose";

const MobileOTPSchema = new mongoose.Schema({
  phone:     { type: String, required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  otp:       { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 },
});

MobileOTPSchema.index({ phone: 1, companyId: 1 });

export default mongoose.models.MobileOTP ||
  mongoose.model("MobileOTP", MobileOTPSchema);
