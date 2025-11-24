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
    match: [/^[0-9]{6}$/, "Invalid PIN code format"]
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
    required: [true, "Supplier group is required"],
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
    enum: [
      "Registered Regular",
      "Registered Composition",
      "Unregistered",
      "SEZ",
      "Overseas",
      "Deemed Export",
      "UIN Holders",
      "Tax Deductor",
      "Tax Collector",
      "Input Service Distributor"
    ]
  },

  pan: {
    type: String,
    required: [true, "PAN is required"],
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
    ref: "BankHead",
 
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





// import mongoose from "mongoose";

// const SupplierSchema = new mongoose.Schema({
//   supplierCode: { type: String, required: true, unique: true },
//   supplierName: { type: String, required: true },
//   supplierType: { type: String, required: true },
//   emailId: { type: String, required: true },
//   mobileNumber: { type: String, required: true },
//   billingAddress1: { type: String, required: true },
//   billingAddress2: { type: String },
//   billingCountry: { type: String, required: true },
//   billingState: { type: String, required: true },
//   billingCity: { type: String, required: true },
//   billingZip: { type: String, required: true },
//   shippingAddress1: { type: String, required: true },
//   shippingAddress2: { type: String },
//   shippingCountry: { type: String, required: true },
//   shippingState: { type: String, required: true },
//   shippingCity: { type: String, required: true },
//   shippingZip: { type: String, required: true },
//   paymentTerms: { type: String, required: true },
//   gstNumber: { type: String, required: true },
//   pan: { type: String, required: true },
//   contactPersonName: { type: String, required: true },
//   bankAccountNumber: { type: String, required: true },
//   ifscCode: { type: String, required: true },
//   leadTime: { type: Number, required: true },
//   qualityRating: { type: String, enum: ["A", "B", "C", "D"] },
//   supplierCategory: { type: String, default: "" },
//   supplierGroup: { type: String, required: true },
//   gstCategory: { type: String, required: true },
// }, { timestamps: true });

// const Supplier = mongoose.models.Supplier || mongoose.model("Supplier", SupplierSchema);

// export default Supplier;


// import mongoose from "mongoose";

// const SupplierSchema = new mongoose.Schema({
//   supplierCode: { type: String, required: true, unique: true },
//   supplierName: { type: String, required: true },
//   supplierType: { type: String, required: true }, // Ensure this is provided
//   emailId: { type: String, required: true },
//   mobileNumber: { type: String, required: true },
  
//   billingAddress: {
//     address1: { type: String, required: true },
//     address2: { type: String },
//     country: { type: String, required: true },
//     state: { type: String, required: true },
//     city: { type: String, required: true },
//     zip: { type: String, required: true },
//   },

//   shippingAddress: {
//     address1: { type: String, required: true },
//     address2: { type: String },
//     country: { type: String, required: true },
//     state: { type: String, required: true },
//     city: { type: String, required: true },
//     zip: { type: String, required: true },
//   },

//   paymentTerms: { type: String },
//   gstNumber: { type: String, required: true },
//   pan: { type: String, required: true },
//   contactPersonName: { type: String, required: true },

//   bankDetails: {
//     accountNumber: { type: String, required: true },
//     ifscCode: { type: String, required: true },
//   },

//   leadTime: { type: Number, required: true },
//   qualityRating: { type: String, required: true }, // Change to string if needed
//   supplierCategory: { type: String },
//   supplierGroup: { type: String, required: true },
//   gstCategory: { type: String, required: true },
// });

// export default mongoose.models.Supplier || mongoose.model("Supplier", SupplierSchema);

