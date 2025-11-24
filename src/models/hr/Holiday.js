import mongoose from "mongoose";

const HolidaySchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },

  title: String,
  date: { type: String, required: true }, // YYYY-MM-DD
  description: String

}, { timestamps: true });

export default mongoose.models.Holiday || mongoose.model("Holiday", HolidaySchema);
