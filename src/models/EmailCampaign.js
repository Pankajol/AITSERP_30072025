import mongoose from "mongoose";

const CampaignSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Company",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "commonUsers",
    },

    // --- Basic Info ---
    campaignName: { type: String, required: true },
   scheduledTime: {
  type: Date,
  required: true
},

    status: {
  type: String,
  enum: ["Draft", "Scheduled", "Queued", "Running", "Sent", "Failed"],
  default: "Scheduled",
},

    // --- Channel Logic ---
    channel: {
      type: String,
      enum: ["email", "whatsapp"],
      required: true,
    },

    sender: { type: String, required: true },

    // --- Content (HTML for email, plain text for WhatsApp) ---
    content: { type: String, required: true },

    // Email Only
    emailSubject: { type: String },
    ctaText: { type: String },

    // Attachments
    attachments: [{ type: String }],

    // --- Audience Logic ---
    recipientSource: {
      type: String,
      enum: ["segment", "excel", "manual"],
      required: true,
    },

    recipientList: { type: String },
    recipientManual: { type: String },
    recipientExcelEmails: {
  type: [String],
  default: [],
},
  },
  { timestamps: true }
);

export default mongoose.models.Campaign ||
  mongoose.model("Campaign", CampaignSchema);



// import mongoose from "mongoose";

// const CampaignSchema = new mongoose.Schema(
//   {
    // companyId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   required: true,
    //   ref: "Company",
    // },
//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       required: true,
//       ref: "User",
//     },

//     campaignName: { type: String, required: true },
//     emailSubject: { type: String, required: true },
//     recipientList: { type: String, required: true },
//     emailBody: { type: String, required: true },
//     ctaText: { type: String, required: true },
//     sender: { type: String, required: true },

//     scheduledTime: { type: Date, required: true },

//     status: {
//       type: String,
//       enum: ["Scheduled", "Sent", "Failed"],
//       default: "Scheduled",
//     },
//   },
//   { timestamps: true }
// );

// export default mongoose.models.EmailCampaign ||
//   mongoose.model("EmailCampaign", CampaignSchema);
