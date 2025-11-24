import mongoose from "mongoose";

const SLASchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  name: { type: String, required: true },
  responseHours: { type: Number, default: 4 }, // hours to first response
  resolutionHours: { type: Number, default: 72 }, // hours to resolve
  priority: { type: String, default: "normal" }, // could be used to match priority
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
}, { timestamps: true });

export default mongoose.models.SLA || mongoose.model("SLA", SLASchema);
