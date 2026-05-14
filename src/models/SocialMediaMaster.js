import mongoose from "mongoose";
import crypto from "crypto";

// ── Encrypt helper ────────────────────────────────────
function encrypt(text) {
  if (!text) return null;
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) return text;
  try {
    const key = crypto.createHash("sha256").update(secret).digest();
    const iv  = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let enc = cipher.update(text, "utf8", "hex");
    enc += cipher.final("hex");
    return iv.toString("hex") + ":" + enc;
  } catch { return text; }
}

// ── Platform credential sub-schema ───────────────────
const PlatformSchema = new mongoose.Schema({
  enabled:     { type: Boolean, default: false },
  accountName: { type: String },   // display name / page name
  accountId:   { type: String },   // page id / channel id / username
  token:       { type: String },   // encrypted access token / api key
  secret:      { type: String },   // encrypted secret / app password
  extra1:      { type: String },   // platform-specific extra field (encrypted)
  extra2:      { type: String },   // platform-specific extra field (encrypted)
  expiresAt:   { type: Date },     // token expiry if applicable
  status:      { type: String, enum: ["Active", "Inactive", "Expired"], default: "Active" },
}, { _id: false });

// ── Main Social Media Master schema ──────────────────
const SocialMediaMasterSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Company",
      unique: true,   // one master per company
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "commonUsers" },
    masterName: { type: String, default: "Social Media Master" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },

    // ── Platforms ──────────────────────────────────────
    whatsapp: {
      ...PlatformSchema.obj,
      phoneNumberId: { type: String },   // Meta Phone Number ID
      // token = WABA Token (encrypted)
    },

    instagram: {
      ...PlatformSchema.obj,
      // accountId = Instagram Page/Business ID
      // token    = Long-lived Access Token (encrypted)
    },

    facebook: {
      ...PlatformSchema.obj,
      // accountId = Facebook Page ID
      // token    = Page Access Token (encrypted)
      appId:     { type: String },
      appSecret: { type: String }, // encrypted
    },

    youtube: {
      ...PlatformSchema.obj,
      // accountId = Channel ID
      // token    = API Key (encrypted)
      // secret   = OAuth Client Secret (encrypted)
      clientId:  { type: String }, // OAuth Client ID
    },

    twitter: {
      ...PlatformSchema.obj,
      // token  = API Key / Consumer Key (encrypted)
      // secret = API Secret (encrypted)
      accessToken:       { type: String }, // encrypted
      accessTokenSecret: { type: String }, // encrypted
    },

    linkedin: {
      ...PlatformSchema.obj,
      // accountId = Organization URN / Person URN
      // token    = Client ID
      // secret   = Client Secret (encrypted)
      accessToken: { type: String }, // encrypted OAuth access token
    },

    // ── Custom platforms (Shopify, TikTok, Pinterest etc.) ──
    customPlatforms: [
      {
        platformName: { type: String, required: true }, // e.g. "Shopify", "TikTok"
        accountName:  { type: String },
        accountId:    { type: String },
        token:        { type: String }, // encrypted
        secret:       { type: String }, // encrypted
        webhookUrl:   { type: String },
        apiEndpoint:  { type: String },
        extra:        { type: String }, // any extra JSON string
        enabled:      { type: Boolean, default: false },
        status:       { type: String, enum: ["Active", "Inactive"], default: "Active" },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.SocialMediaMaster ||
  mongoose.model("SocialMediaMaster", SocialMediaMasterSchema);