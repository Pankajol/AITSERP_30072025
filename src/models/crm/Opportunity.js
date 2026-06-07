import mongoose from "mongoose";

const { Schema } = mongoose;

// Address sub‑schema (reusable)
const AddressSchema = new Schema(
  {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true, default: "India" },
  },
  { _id: false }
);

const opportunitySchema = new Schema(
  {
    // Multi‑tenant
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    // Basic deal information
    opportunityName: {
      type: String,
      required: true,
      trim: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    stage: {
      type: String,
      required: true,
    },
    closeDate: {
      type: Date,
      required: true,
    },
    probability: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    leadSource: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },

    // ✅ New contact & tax fields (for direct capture)
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    phone: {
      type: String,
      trim: true,
    },
    mobile: {
      type: String,
      trim: true,
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
    },
    gst: {
      type: String,
      trim: true,
      uppercase: true,
    },
    billingAddress: AddressSchema,
    shippingAddress: AddressSchema,

    // Quotations linked to this opportunity (multiple allowed)
    quotations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SalesQuotation",
        default: [],
      },
    ],

    // Optional: reference to the customer after closing won
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
    },
  },
  { timestamps: true }
);

// Text index for global search
opportunitySchema.index(
  {
    opportunityName: "text",
    accountName: "text",
    description: "text",
    email: "text",
    pan: "text",
  },
  {
    name: "opportunity_text_search",
    weights: {
      opportunityName: 10,
      accountName: 8,
      description: 5,
      email: 6,
      pan: 4,
    },
  }
);

export default mongoose.models.Opportunity ||
  mongoose.model("Opportunity", opportunitySchema);



// // models/Opportunity.js
// import mongoose from "mongoose";

// const opportunitySchema = new mongoose.Schema({
//   opportunityFrom: { type: String, required: true },
//   opportunityType: { type: String, required: true },
//   salesStage: { type: String, required: true },
//   source: String,
//   party: String,
//   opportunityOwner: String,
//   expectedClosingDate: { type: Date, required: true },
//   status: String,
//   probability: Number,
//   employees: Number,
//   industry: String,
//   city: String,
//   state: String,
//   annualRevenue: Number,
//   marketSegment: String,
//   country: String,
//   website: String,
//   territory: String,
//   currency: String,
//   opportunityAmount: { type: Number, required: true },
//   company: String,
//   printLanguage: String,
//   opportunityDate: Date,
// }, {
//   timestamps: true,
// });

// export default mongoose.models.Opportunity || mongoose.model("Opportunity", opportunitySchema);
