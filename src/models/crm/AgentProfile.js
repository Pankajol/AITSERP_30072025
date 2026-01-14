import mongoose from "mongoose";

const AgentProfileSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    isOnline: { type: Boolean, default: true },
    isBusy: { type: Boolean, default: false },

    // routing categories
    categories: {
      type: [String],
      default: ["sales"],
      enum: ["sales", "payment", "offer", "support", "delivery", "general"],
    },

    // priority (high wins)
    priority: { type: Number, default: 1 },

    lastCallAt: { type: Date, default: null },
  },
  { timestamps: true }
);

AgentProfileSchema.index({ companyId: 1, userId: 1 }, { unique: true });

export default mongoose.models.AgentProfile || mongoose.model("AgentProfile", AgentProfileSchema);
