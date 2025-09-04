import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    salutation: {
      type: String,
      // enum: ["Mr.", "Ms.", "Mrs.", "Dr.", "Prof.", "Other"],
      default: "",
    },
    jobTitle: { type: String, trim: true },
    leadOwner: { type: String, trim: true },

    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, trim: true },

    gender: { type: String, },  //enum: ["Male", "Female", "Other"] 
    status: {
      type: String,
      // enum: ["New", "Contacted", "Qualified", "Lost", "Converted"],
      default: "New",
    },

    source: {
      type: String,
      // enum: ["Website", "Referral", "Email", "Phone", "Social Media", "Other"],
      default: "Other",
    },
    // leadType: { type: String, enum: ["Cold", "Warm", "Hot"], default: "Cold" },
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

    qualificationStatus: {
      type: String,
      // enum: ["Unqualified", "Qualified", "In Progress"],
      // default: "Unqualified",
    },
    qualifiedBy: { type: String, trim: true },
    qualifiedOn: { type: Date },
  },
  { timestamps: true }
);

const Lead = mongoose.models.Lead || mongoose.model("Lead", leadSchema);
export default Lead;
