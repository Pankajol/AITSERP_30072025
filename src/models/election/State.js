import mongoose from "mongoose";

const StateSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  name: { type: String, required: true },
  code: { type: String }, // optional state code
}, { timestamps: true });

// Unique state name per company
StateSchema.index({ companyId: 1, name: 1 }, { unique: true });

export default mongoose.models.State || mongoose.model("State", StateSchema);