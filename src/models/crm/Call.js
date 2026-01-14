import mongoose from "mongoose";

const CallSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },

    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact", default: null },

    fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    toUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    toPhone: { type: String, default: "" },

    direction: { type: String, enum: ["outgoing", "incoming"], required: true },
    type: { type: String, enum: ["internal", "external"], default: "external" },

    category: {
      type: String,
      enum: ["sales", "payment", "offer", "support", "delivery", "general"],
      default: "general",
    },

    status: {
      type: String,
      enum: ["ringing", "connected", "missed", "ended", "rejected", "busy", "failed"],
      default: "ringing",
    },

    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    durationSec: { type: Number, default: 0 },

    notes: { type: String, default: "" },
    recordingUrl: { type: String, default: "" },

    provider: { type: String, enum: ["webrtc", "twilio"], default: "webrtc" },

    meta: {
      device: { type: String, default: "web" },
      source: { type: String, default: "erp-crm" },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Call || mongoose.model("Call", CallSchema);
