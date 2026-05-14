import mongoose from "mongoose";

const { Schema } = mongoose;

const opportunitySchema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

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
  },
  { timestamps: true }
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
