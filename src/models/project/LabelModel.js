import mongoose from "mongoose";

const LabelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  color: { type: String, default: "#000000" }
}, { timestamps: true });

export default mongoose.models.Label || mongoose.model("Label", LabelSchema);
