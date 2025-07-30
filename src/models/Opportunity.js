// models/Opportunity.js
import mongoose from "mongoose";

const opportunitySchema = new mongoose.Schema({
  opportunityFrom: { type: String, required: true },
  opportunityType: { type: String, required: true },
  salesStage: { type: String, required: true },
  source: String,
  party: String,
  opportunityOwner: String,
  expectedClosingDate: { type: Date, required: true },
  status: String,
  probability: Number,
  employees: Number,
  industry: String,
  city: String,
  state: String,
  annualRevenue: Number,
  marketSegment: String,
  country: String,
  website: String,
  territory: String,
  currency: String,
  opportunityAmount: { type: Number, required: true },
  company: String,
  printLanguage: String,
  opportunityDate: Date,
}, {
  timestamps: true,
});

export default mongoose.models.Opportunity || mongoose.model("Opportunity", opportunitySchema);
