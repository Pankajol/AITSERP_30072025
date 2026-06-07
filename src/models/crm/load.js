import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    // 👇 Add this line
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    salutation: { type: String, default: "" },
    jobTitle: { type: String, trim: true },
    leadOwner: { type: String, trim: true },

    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, trim: true },

    gender: { type: String },
    status: {
      type: String,
      default: "New",
    },

    source: { type: String, default: "Other" },
    requestType: { type: String, trim: true },

    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    mobileNo: {
      type: String,
      trim: true,
      match: [/^\d{10,15}$/, "Mobile number must be 10–15 digits"],
    },
    phone: { type: String, trim: true },
    phoneExt: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    fax: { type: String, trim: true },

    website: { type: String, trim: true },
    organizationName: { type: String, trim: true },
    annualRevenue: { type: Number, min: 0 },
    employees: { type: Number, min: 0 },
    industry: { type: String, trim: true },
    marketSegment: { type: String, trim: true },

    city: { type: String, trim: true },
    state: { type: String, trim: true },
    county: { type: String, trim: true },
    territory: { type: String, trim: true },

    qualificationStatus: { type: String },
    qualifiedBy: { type: String, trim: true },
    qualifiedOn: { type: Date },

    socialMediaProfile: {
  platform: { type: String, enum: ['facebook', 'instagram', 'whatsapp', 'shopify', 'indiamart', null] },
  profileId: String,   // unique ID from platform
  username: String,
  followers: Number,
},
leadScore: { type: Number, default: 0 },   // for lead scoring
tags: [String], 

    // 👇 New field to track if lead is already converted
    convertedToOpportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Opportunity",
      default: null,
    },

    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);
// Global search text index
leadSchema.index(
  {
    firstName: "text",
    lastName: "text",
    email: "text",
    mobileNo: "text",
    organizationName: "text",
    "customFields.name": "text",
  },
  {
    name: "lead_text_search",
    default_language: "none",
    weights: {
      firstName: 10,
      lastName: 10,
      email: 8,
      mobileNo: 8,
      organizationName: 6,
      "customFields.name": 2,
    },
  }
);

const Lead = mongoose.models.Lead || mongoose.model("Lead", leadSchema);
export default Lead;