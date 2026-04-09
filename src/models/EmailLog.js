import mongoose from "mongoose";

const EmailLogSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "EmailCampaign" },
  emailMasterId: { type: mongoose.Schema.Types.ObjectId, ref: "EmailMaster" },

  to: { type: String, required: true },
  status: { type: String, default: "sending" }, // sending, sent, failed
  error: { type: String },

  // Open tracking
  isOpened: { type: Boolean, default: false },
  openCount: { type: Number, default: 0 },
  firstOpenedAt: Date,
  lastOpenedAt: Date,

  // Link tracking
  linkClicked: { type: Boolean, default: false },
  clickCount: { type: Number, default: 0 },
  clickedAt: Date,
  lastClickUrl: String,

  // Attachment tracking (now works with hosted files + tracked links)
  attachmentOpened: { type: Boolean, default: false },
  attachmentDownloadCount: { type: Number, default: 0 },
  attachmentDownloadedAt: Date,

  // Device info
  ip: String,
  userAgent: String,
  city: String,
  region: String,
  country: String,

  sentAt: Date,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.EmailLog || mongoose.model("EmailLog", EmailLogSchema);


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
