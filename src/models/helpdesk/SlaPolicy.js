import mongoose from "mongoose";

const SlaPolicySchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },

  name: String, // VIP / Standard

  firstResponseMinutes: Number,
  resolutionMinutes: Number,

  priority: {
    type: String,
    enum: ["normal","high","vip"],
    default: "normal"
  },

  isActive: { type: Boolean, default: true }
},{timestamps:true});

export default mongoose.models.SlaPolicy ||
mongoose.model("SlaPolicy", SlaPolicySchema);