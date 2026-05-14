import mongoose from "mongoose";

const SocialCampaignSchema = new mongoose.Schema(
  {
    companyId:  { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Company" },
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: "commonUsers" },

    campaignName: { type: String, required: true },
    status: {
      type: String,
      enum: ["Draft", "Scheduled", "Sending", "Sent", "Failed"],
      default: "Scheduled",
    },

    // ── Platforms ──────────────────────────────────────
    platforms: {
      type: [String],
      enum: ["instagram", "facebook", "youtube", "twitter", "linkedin"],
      required: true,
    },
    contentType: {
      type: String,
      enum: ["post", "video", "story", "reel"],
      default: "post",
    },

    // ── Send modes ─────────────────────────────────────
    sendModes: {
      type: [String],
      enum: ["schedule", "instant", "email", "whatsapp"],
      default: ["schedule"],
    },

    // ── Content ────────────────────────────────────────
    topic:       { type: String },
    industry:    { type: String },
    caption:     { type: String, required: true },
    hashtags:    { type: [String], default: [] },
    mediaUrls:   { type: [String], default: [] },
    videoScript: { type: String },
    imagePrompt: { type: String },

    // ── Schedule ───────────────────────────────────────
    scheduledTime: { type: Date },
    sentAt:        { type: Date },

    // ── Email & WhatsApp ───────────────────────────────
    emailRecipients: { type: [String], default: [] },
    whatsappNumbers: { type: [String], default: [] },

    // ── Platform post IDs (after publishing) ──────────
    publishedIds: {
      instagram: { type: String },
      facebook:  { type: String },
      youtube:   { type: String },
      twitter:   { type: String },
      linkedin:  { type: String },
    },
  },
  { timestamps: true }
);

export default mongoose.models.SocialCampaign ||
  mongoose.model("SocialCampaign", SocialCampaignSchema);