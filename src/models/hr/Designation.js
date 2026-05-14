import mongoose from "mongoose";

const DesignationSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },

  title: { type: String, required: true, unique: true },
  level: Number,
  description: String

}, { timestamps: true });

export default mongoose.models.Designation || mongoose.model("Designation", DesignationSchema);
