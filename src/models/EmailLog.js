import mongoose from "mongoose";

const EmailLogSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "EmailCampaign" },

  to: { type: String, required: true },

  // Tracking
  isOpened: { type: Boolean, default: false },
  openCount: { type: Number, default: 0 },
  firstOpenedAt: Date,
  lastOpenedAt: Date,

  attachmentOpened: { type: Boolean, default: false },
  linkClicked: { type: Boolean, default: false },

  // NEW: Device / Location / IP
  ip: String,
  userAgent: String,
  city: String,
  region: String,
  country: String,

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.EmailLog ||
  mongoose.model("EmailLog", EmailLogSchema);
