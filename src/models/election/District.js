import mongoose from "mongoose";

const DistrictSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  name: { type: String, required: true },
  state: { type: mongoose.Schema.Types.ObjectId, ref: "State", required: true },
}, { timestamps: true });

// Unique district name within a state for the same company
DistrictSchema.index({ companyId: 1, name: 1, state: 1 }, { unique: true });

export default mongoose.models.District || mongoose.model("District", DistrictSchema);