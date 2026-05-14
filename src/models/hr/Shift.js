import mongoose from "mongoose";

const ShiftSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },

  name: { type: String, required: true }, // Morning, Night
  startTime: { type: String, required: true }, // 09:00
  endTime: { type: String, required: true },   // 18:00

  gracePeriod: { type: Number, default: 10 }, // minutes
  weeklyOffs: [String], // ["Sunday","Saturday"]

}, { timestamps: true });

export default mongoose.models.Shift || mongoose.model("Shift", ShiftSchema);
