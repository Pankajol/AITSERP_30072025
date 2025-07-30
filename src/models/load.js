import mongoose from "mongoose";

const leadSchema = new mongoose.Schema({
  salutation: String,
  jobTitle: String,
  leadOwner: String,
  firstName: { type: String, required: true },
  gender: String,
  status: String,
  middleName: String,
  source: String,
  leadType: String,
  lastName: String,
  requestType: String,
  email: { type: String, required: true },
  mobileNo: { type: String, required: true },
  phone: String,
  website: String,
  whatsapp: String,
  phoneExt: String,
  organizationName: String,
  annualRevenue: String,
  territory: String,
  employees: String,
  industry: String,
  fax: String,
  marketSegment: String,
  city: String,
  state: String,
  county: String,
  qualificationStatus: String,
  qualifiedBy: String,
  qualifiedOn: Date,
}, { timestamps: true });

const Lead = mongoose.models.Lead || mongoose.model("Lead", leadSchema);
export default Lead;
