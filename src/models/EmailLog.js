import mongoose from "mongoose";

const EmailLogSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "EmailCampaign" },
  emailMasterId: { type: mongoose.Schema.Types.ObjectId, ref: "EmailMaster" }, // Kaunse account se gaya

  to: { type: String, required: true },
  status: { type: String, default: "sending" }, // sending, sent, failed, clicked
  error: { type: String }, // Agar fail ho toh reason save karne ke liye

  // --- Open Tracking ---
  isOpened: { type: Boolean, default: false },
  openCount: { type: Number, default: 0 },
  firstOpenedAt: Date,
  lastOpenedAt: Date,

  // --- Link Tracking (Inhe Add Karein) ---
  linkClicked: { type: Boolean, default: false }, // Aapke paas already hai
  clickCount: { type: Number, default: 0 },       // <-- ADD THIS (Link tracking route ke liye)
  clickedAt: Date,                                // <-- ADD THIS
  lastClickUrl: String,                           // <-- ADD THIS (Kaunse link par click kiya)

  attachmentOpened: { type: Boolean, default: false },

  // --- Device / Location / IP ---
  ip: String,
  userAgent: String,
  city: String,
  region: String,
  country: String,

  sentAt: Date,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.EmailLog ||
  mongoose.model("EmailLog", EmailLogSchema);


// import mongoose from "mongoose";

// const EmailLogSchema = new mongoose.Schema({
//   companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
//   campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "EmailCampaign" },

//   to: { type: String, required: true },

//   // Tracking
//   isOpened: { type: Boolean, default: false },
//   openCount: { type: Number, default: 0 },
//   firstOpenedAt: Date,
//   lastOpenedAt: Date,

//   attachmentOpened: { type: Boolean, default: false },
//   linkClicked: { type: Boolean, default: false },

//   // NEW: Device / Location / IP
//   ip: String,
//   userAgent: String,
//   city: String,
//   region: String,
//   country: String,

//   createdAt: { type: Date, default: Date.now },
// });

// export default mongoose.models.EmailLog ||
//   mongoose.model("EmailLog", EmailLogSchema);
