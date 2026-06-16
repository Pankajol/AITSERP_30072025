import mongoose from "mongoose";

// --- Support email sub‑schema (kept as you defined) ---
const SupportEmailSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["gmail", "outlook", "smtp"],
      default: "gmail",
    },
    appPassword: {
      type: String,
      required: true,
      select: false, // security: never returned in queries
    },
    // Outlook‑specific fields
    tenantId: {
      type: String,
      required: function () { return this.type === "outlook"; },
    },
    clientId: {
      type: String,
      required: function () { return this.type === "outlook"; },
    },
    webhookSecret: {
      type: String,
      required: function () { return this.type === "outlook"; },
    },
    inboundEnabled: { type: Boolean, default: true },
    outboundEnabled: { type: Boolean, default: true },
    subscriptionId: { type: String },
    subscriptionExpiresAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false } // no separate _id for sub‑documents
);

// --- Working hours sub‑schema (kept as you defined) ---
const WorkingHoursSchema = new mongoose.Schema(
  {
    startHour: { type: Number, default: 10 },
    endHour:   { type: Number, default: 18 },
    workingDays: { type: [Number], default: [1, 2, 3, 4, 5] },
  },
  { _id: false }
);

// --- Main Company schema ---
const CompanySchema = new mongoose.Schema(
  {
    // Identity
    companyName: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    phone: { type: String, required: true }, // regex removed – validation in API (international)
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    country: { type: String, required: true },
    address: { type: String, required: true },
    pinCode: { type: String, required: true }, // regex removed – validation per country in API
    password: {
      type: String,
      required: true,
      select: false, // never returned in queries
    },
    agreeToTerms: { type: Boolean, required: true, default: false },

    // Business info
    businessType: {
      type: String,
      enum: ["Pvt Ltd", "LLP", "Partnership", "Sole Proprietorship"],
      default: null,
    },
    industry: {
      type: String,
      enum: ["Manufacturing", "IT / Software", "Retail", "Healthcare", "Education", "Real Estate / Society", "Political / Election", "Other"],
      default: null,
    },
    gstNumber: {
      type: String,
      unique: true,
      sparse: true,
      uppercase: true,
      trim: true,
      // regex removed – validation in API (only for India)
    },
       // Subscription / plan
    plan: {
      type: String,
      enum: ["starter", "growth"],
      default: "starter",
    },
    paymentMethod: {
      type: String,
      enum: ["upi", "card", "netbanking", "razorpay", "qr", "cash", "paylater", "trial"],
      default: null,
    },
    planActivatedAt: { type: Date, default: null },
    trialEndsAt: { type: Date, default: null },

    // NEW FIELDS (add these)
    planType: {
      type: String,
      enum: ['trial', 'monthly', 'yearly', 'lifetime'],
      default: 'trial',
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'canceled', 'expired'],
      default: 'trialing',
    },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    razorpaySubscriptionId: { type: String, default: null },
    razorpayPlanId: { type: String, default: null },
    // Subscription / plan
    plan: {
      type: String,
      enum: ["starter", "growth"],
      default: "starter",
    },
    paymentMethod: {
      type: String,
      enum: ["upi", "card", "netbanking", "razorpay", "qr", "cash", "paylater", "trial"],
      default: null,
    },
    planActivatedAt: { type: Date, default: null },
    trialEndsAt: { type: Date, default: null },

    // Theme / Management type (new)
    managementType: {
      type: String,
      enum: ["erp", "society", "healthcare", "education", "retail", "election"],
      default: "erp",
    },
    erpModules: { type: String, trim: true },
    employeeCount: { type: Number },
    societyRegNo: { type: String, trim: true },
    totalFlats: { type: Number },
    committeeName: { type: String, trim: true },
    licenseNumber: { type: String, trim: true },
    facilityType: { type: String, trim: true },
    bedCapacity: { type: Number },
    institutionCode: { type: String, trim: true },
    boardOrUniversity: { type: String, trim: true },
    studentCapacity: { type: Number },
    storePan: { type: String, trim: true },
    outletCount: { type: Number },
    primaryCategory: { type: String, trim: true },
    constituencyName: { type: String, trim: true },
    electionType: { type: String, trim: true },
    electionDate: { type: Date },
    boothCount: { type: Number },

    // Support emails (as you defined)
    supportEmails: {
      type: [SupportEmailSchema],
      default: [],
    },

    // Working hours (as you defined)
    workingHours: {
      type: WorkingHoursSchema,
      default: () => ({}),
    },

    // Status
    isActive: { type: Boolean, default: true }, // you can set false if email verification is added later
  },
  { timestamps: true }
);

// ✅ No separate .index() calls for email or gstNumber – uniqueness is already in the field definitions.
// If you need compound indexes, add them here, but avoid duplicate index definitions.

if (mongoose.models.Company) {
  delete mongoose.models.Company;
}

export default mongoose.model("Company", CompanySchema);




//     import mongoose from 'mongoose';

//     const CompanySchema = new mongoose.Schema(
//       {
//         companyName: {
//           type: String,
//           required: true,
//           trim: true,
//         },
//         contactName: {
//           type: String,
//           required: true,
//           trim: true,
//         },
//         phone: {
//           type: String,
//           required: true,
//           match: /^[0-9]{10}$/,
//         },
//         email: {
//           type: String,
//           required: true,
//           unique: true,
//           lowercase: true,
//           trim: true,
//         },
//     //     supportEmails: {
//     //   type: [String],
//     //   default: [],
//     // },
//     supportEmails: {
//       type: [
//         {
//           email: {
//             type: String,
//             required: true,
//             lowercase: true,
//             trim: true,
//           },
//           type: {
//             type: String,
//             enum: ["gmail", "outlook", "smtp"],
//             default: "gmail",
//           },
//           appPassword: {
//             type: String,
//             required: true,
//             select: false, // 🔐 security (GET me nahi aayega)
//           },

//           tenantId: {
//         type: String,
//         required: function () {
//           return this.type === "outlook";
//         },
//       },

//       clientId: {
//         type: String,
//         required: function () {
//           return this.type === "outlook";
//         },
//       },

//       webhookSecret: {
//         type: String,
//         required: function () {
//           return this.type === "outlook";
//         },
//       },
//           inboundEnabled: {
//             type: Boolean,
//             default: true,
//           },
//           outboundEnabled: {
//             type: Boolean,
//             default: true,
//           },
//           subscriptionId: { type: String },
// subscriptionExpiresAt: { type: Date },

//           createdAt: {
//             type: Date,
//             default: Date.now,
//           },
//         },
//       ],
//       default: [],
//     },

//         gstNumber: {
//           type: String,
//           unique: true,
//           sparse: true, // optional field, but still enforce uniqueness if present
//           uppercase: true,
//           trim: true,
//           match: /^[0-9A-Z]{15}$/,
//         },
//         country: {
//           type: String,
//           required: true,
//         },
//         address: {
//           type: String,
//           required: true,
//         },
//         pinCode: {
//           type: String,
//           required: true,
//           match: /^[0-9]{6}$/,
//         },
//         password: {
//           type: String,
//           required: true,
//         },
//         workingHours: {
//   startHour: { type:Number, default:10 },
//   endHour: { type:Number, default:18 },
//   workingDays: { type:[Number], default:[1,2,3,4,5] }
// },
//         agreeToTerms: {
//           type: Boolean,
//           default: false,
//         },
//       },
//       { timestamps: true }
//     );

//     // Prevent model overwrite issue in development
//     export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
