import mongoose from "mongoose";

// Reusable address schema
const addressSchema = new mongoose.Schema({
  address1: { type: String, trim: true },
  address2: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  country: { type: String, trim: true },
  pin: {
    type: String,
    trim: true,
    // match: [/^[0-9]{6}$/, "Invalid PIN code format"]
  }
}, { _id: false });

const SupplierSchema = new mongoose.Schema({
    companyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' },
  supplierCode: {
    type: String,
    required: [true, "Supplier code is required"],

    trim: true,
    uppercase: true
  },
  supplierName: {
    type: String,
    required: [true, "Supplier name is required"],
    trim: true
  },
  supplierType: {
    type: String,
 
  
    trim: true
  },
  supplierGroup: {
    type: String,
    // required: [true, "Supplier group is required"],
    trim: true
  },
  supplierCategory: {
    type: String,
    default: "",
    trim: true
  },

  emailId: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Invalid email format"]
  },
  mobileNumber: {
    type: String,
   
  },
  valid: { type: Boolean, default: false },
  incorporated: { type: String, trim: true },
  udyamNumber: {
    type: String,
    trim: true,
    uppercase: true,
  
  },
  contactNumber: {
    type: String,
    match: [/^[0-9]{10}$/, "Invalid contact number format"]
  },
  alternateContactNumber: {
    type: String,
    match: [/^[0-9]{10}$/, "Invalid alternate contact number format"]
  },  
  contactPersonName: { type: String, trim: true },

  billingAddresses: {
    type: [addressSchema],
    default: [{ address1: "", address2: "", city: "", state: "", country: "", pin: "" }]
  },
  shippingAddresses: {
    type: [addressSchema],
    default: [{ address1: "", address2: "", city: "", state: "", country: "", pin: "" }]
  },

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
    // enum: [
    //   "Registered Regular",
    //   "Registered Composition",
    //   "Unregistered",
    //   "SEZ",
    //   "Overseas",
    //   "Deemed Export",
    //   "UIN Holders",
    //   "Tax Deductor",
    //   "Tax Collector",
    //   "Input Service Distributor"
    // ]
  },

  pan: {
    type: String,
    // required: [true, "PAN is required"],
    trim: true,
    uppercase: true,
    // match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format"]
  },

  bankName: { type: String, trim: true },
  branch: { type: String, trim: true },
  bankAccountNumber: {
    type: String,
    trim: true,
    match: [/^[0-9]{9,18}$/, "Invalid account number"]
  },
  ifscCode: {
    type: String,
    trim: true,
    uppercase: true,
    match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC Code"]
  },

  glAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AccountHead",
 
  },
  attachments:{
  type: String,
  },


  leadTime: {
    type: Number,
    min: [0, "Lead time must be non-negative"]
  },
  qualityRating: {
    type: String,
    enum: ["A", "B", "C", "D"],
    default: "B"
  }
}, { timestamps: true });

SupplierSchema.index({ supplierCode: 1 });
SupplierSchema.index({ emailId: 1 });
SupplierSchema.index({ mobileNumber: 1 });

SupplierSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoServerError" && error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    next(new Error(`${field} already exists`));
  } else {
    next(error);
  }
});

const Supplier = mongoose.models.Supplier || mongoose.model("Supplier", SupplierSchema);
export default Supplier;