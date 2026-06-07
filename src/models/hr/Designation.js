import mongoose from "mongoose";

const DesignationSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },

  title: { type: String, required: true },
  level: Number,
  description: String

}, { timestamps: true });
// ✅ Compound unique index: same title only once per company
DesignationSchema.index({ companyId: 1, title: 1 }, { unique: true });

export default mongoose.models.Designation || mongoose.model("Designation", DesignationSchema);
