

// --- models/Customer.js ---
import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  address1: { type: String, trim: true },
  address2: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  pin: {
    type: String,
    trim: true,
    match: [/^[0-9]{6}$/, "Invalid pin code format"]
  },
  country: { type: String, trim: true }
}, { _id: false });

const customerSchema = new mongoose.Schema({
  companyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' },
 

assignedAgents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' }],
lastAssignedAgentIndex: {
  type: Number,
  default: -1,
},

  customerCode: {
    type: String,
   
    trim: true,
    uppercase: true
  },
  customerName: {
    type: String,
    required: [true, "Customer name is required"],
    trim: true
  },
  customerGroup: {
    type: String,
    required: [true, "Customer group is required"],
    trim: true
  },
  customerType: {
    type: String,
    required: [true, "Customer type is required"],
    enum: ['Individual', 'Business', 'Government'],
    default: 'Individual'
  },
  emailId: {
    type: String,
   
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Invalid email format"]
  },
//   emailId: {
//   type: String,
//   match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Invalid email format"]
// },
password: {
  type: String,
  select: false
},
portalAccess: { type: Boolean, default: true },
// 🔥 ADD THIS
contactEmails: [
  {
    email: { type: String, lowercase: true, trim: true },
    name: String,
    designation: String,
    password: { type: String, select: false }, // 🔥 Har contact ka apna password
    isPrimary: { type: Boolean, default: false } // Kaun main contact hai
  }
],
  fromLead: { type: String, trim: true },
  mobileNumber: {
    type: String,
    match: [/^[0-9]{10}$/, "Invalid mobile number format"]
  },
  fromOpportunity: { type: String, trim: true },
  billingAddresses: [addressSchema],
  shippingAddresses: [addressSchema],
  paymentTerms: { type: String, trim: true },
  gstNumber: {
    type: String,
    trim: true,
    uppercase: true,
    // match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST format"]
  },
  gstCategory: {
    type: String,
    trim: true,
  
  },
  pan: {
    type: String,
    required: [true, "PAN is required"],
    trim: true,
    uppercase: true,
    // match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format"]
  },
  contactPersonName: { type: String, trim: true },
  commissionRate: { type: String, trim: true },
  glAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BankHead",
    default: null,
  },
  attachments:{
  type: String,
  },

  slaPolicyId:{
  type: mongoose.Schema.Types.ObjectId,
  ref:"SlaPolicy"
}
}, {
  timestamps: true,
  collection: "customers"
});

customerSchema.index({ companyId: 1, customerCode: 1 }, { unique: true, sparse: true });
customerSchema.index({ companyId: 1, emailId: 1 }, { unique: true, sparse: true });
customerSchema.index({ mobileNumber: 1 });

customerSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoServerError" && error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    next(new Error(`${field} already exists`));
  } else {
    next(error);
  }
});

const Customer = mongoose.models.Customer || mongoose.model("Customer", customerSchema);
export default Customer;



