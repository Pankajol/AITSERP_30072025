import mongoose from "mongoose";

const CallQueueSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },

    category: {
      type: String,
      enum: ["sales", "payment", "offer", "support", "delivery", "general"],
      default: "general",
    },

    customerName: { type: String, default: "" },
    customerPhone: { type: String, required: true },

    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },

    status: { type: String, enum: ["queued", "assigned", "completed", "failed"], default: "queued" },

    assignedAgentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    attempts: { type: Number, default: 0 },
    lastTriedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.CallQueue || mongoose.model("CallQueue", CallQueueSchema);
