import mongoose from 'mongoose';
import Counter from "@/models/Counter";

const { Schema } = mongoose;

const BatchSchema = new Schema({
  batchNumber: { type: String },
  expiryDate: { type: Date },
  manufacturer: { type: String },
  batchQuantity: { type: Number, default: 0 },
}, { _id: false });

const QualityCheckDetailSchema = new Schema({
  parameter: { type: String },
  min: { type: Number },
  max: { type: Number },
  actualValue: { type: Number },
}, { _id: false });

const InvoiceItemSchema = new Schema({
  item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
  itemCode: { type: String },
  itemName: { type: String },
  itemDescription: { type: String },
  imageUrl: { type: String, default: "" },        // ✅ Added for variant image
  quantity: { type: Number, default: 0 },
  allowedQuantity: { type: Number, default: 0 },
  receivedQuantity: { type: Number, default: 0 },
  pendingQuantity: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  freight: { type: Number, default: 0 },
  gstRate: { type: Number, default: 0 },
  igstRate: { type: Number, default: 0 },          // ✅ Added
  taxOption: { type: String, enum: ["GST", "IGST"], default: "GST" },
  priceAfterDiscount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  tdsAmount: { type: Number, default: 0 },
  warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse" },
  warehouseName: { type: String },
  warehouseCode: { type: String },
  stockAdded: { type: Boolean, default: false },
  managedBy: { type: String, default: "" },
  batches: { type: [BatchSchema], default: [] },
  errorMessage: { type: String },
  // 🚀 Variant support
  variant: {
    variantId: { type: Schema.Types.ObjectId, ref: "Variant" },
    sku: { type: String },
    attributes: { type: Object, default: {} },
    variantPrice: { type: Number },
    variantImageUrl: { type: String },
    variantBarcode: { type: String }
  },
  selectedVariantId: { type: String, default: null },
}, { _id: false });

const PaymentDetailsSchema = new Schema({
  amount: { type: Number, required: true, default: 0 },
  method: {
    type: String,
    enum: ["cash", "bank", "upi", "card", "netbanking", "wallet", "cheque"],
    required: true,
  },
  bankAccountId: { type: Schema.Types.ObjectId, ref: "AccountHead", default: null },
  upiId: { type: String, default: null },
  transactionId: { type: String, default: null },
  paymentGateway: { type: String, default: null },
  cardLast4Digits: { type: String, default: null },
  cardNetwork: { type: String, enum: ["Visa", "Mastercard", "Amex", "RuPay", null], default: null },
  chequeNumber: { type: String, default: null },
  chequeDate: { type: Date, default: null },
  bankName: { type: String, default: null },
  referenceNumber: { type: String, default: null },
  paymentDate: { type: Date, required: true, default: Date.now },
  notes: { type: String, default: null },
}, { _id: false });

const PurchaseInvoiceSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
  supplierCode: { type: String },
  supplierName: { type: String },
  contactPerson: { type: String },
  postingDate: { type: Date, required: true },
  validUntil: { type: Date },
  documentDate: { type: Date },
  documentNumberPurchaseInvoice: { type: String, required: true, unique: true },
  grn: { type: Schema.Types.ObjectId, ref: "GRN" },
  purchaseOrder: { type: Schema.Types.ObjectId, ref: "PurchaseOrder" },
  invoiceType: {
    type: String,
    enum: ["Normal", "POCopy", "GRNCopy"],
    default: "Normal",
  },
  items: [InvoiceItemSchema],
  qualityCheckDetails: [QualityCheckDetailSchema],
  totalBeforeDiscount: { type: Number, default: 0 },
  gstTotal: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true, default: 0 },
  paidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  payments: [PaymentDetailsSchema],
  paymentStatus: {
    type: String,
    enum: ["Pending", "Partial", "Paid"],
    default: "Pending",
  },
  stockStatus: {
    type: String,
    enum: ["Not Updated", "Updated", "Adjusted"],
    default: "Not Updated",
  },
  status: {
    type: String,
    enum: ["draft", "submitted", "pending", "approved", "rejected", "posted", "cancelled"],
    default: "draft"
  },
  remarks: { type: String },
  salesEmployee: { type: String },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedAt: Date,
    publicId: String
  }],
}, { timestamps: true });

PurchaseInvoiceSchema.index({ companyId: 1, documentNumberPurchaseInvoice: 1 }, { unique: true });
PurchaseInvoiceSchema.index({ supplier: 1, postingDate: -1 });
PurchaseInvoiceSchema.index({ paymentStatus: 1 });
PurchaseInvoiceSchema.index({ "payments.transactionId": 1 }, { sparse: true });
PurchaseInvoiceSchema.index({ "payments.chequeNumber": 1 }, { sparse: true });

export default mongoose.models.PurchaseInvoice || mongoose.model("PurchaseInvoice", PurchaseInvoiceSchema);




// import mongoose from "mongoose";
// import Counter from "@/models/Counter";

// const { Schema } = mongoose;

// const BatchSchema = new Schema({
//   batchNumber: { type: String },
//   expiryDate: { type: Date },
//   manufacturer: { type: String },
//   batchQuantity: { type: Number, default: 0 },
// }, { _id: false });

// const QualityCheckDetailSchema = new Schema({
//   parameter: { type: String },
//   min: { type: Number },
//   max: { type: Number },
//   actualValue: { type: Number },
// }, { _id: false });

// const InvoiceItemSchema = new Schema({
//   item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
//   itemCode: { type: String },
//   itemName: { type: String },
//   itemDescription: { type: String },
//   quantity: { type: Number, default: 0 },
//   allowedQuantity: { type: Number, default: 0 },
//   receivedQuantity: { type: Number, default: 0 },
//   pendingQuantity: { type: Number, default: 0 },
//   unitPrice: { type: Number, default: 0 },
//   discount: { type: Number, default: 0 },
//   freight: { type: Number, default: 0 },
//   gstRate: { type: Number, default: 0 },
//   taxOption: { type: String, enum: ["GST", "IGST"], default: "GST" },
//   priceAfterDiscount: { type: Number, default: 0 },
//   totalAmount: { type: Number, default: 0 },
//   gstAmount: { type: Number, default: 0 },
//   cgstAmount: { type: Number, default: 0 },
//   sgstAmount: { type: Number, default: 0 },
//   igstAmount: { type: Number, default: 0 },
//   tdsAmount: { type: Number, default: 0 },
//   warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse" },
//   warehouseName: { type: String },
//   warehouseCode: { type: String },
//   stockAdded: { type: Boolean, default: false },
//   managedBy: { type: String, default: "" },
//   batches: { type: [BatchSchema], default: [] },
//   errorMessage: { type: String },
// }, { _id: false });

// // ========== Payment Details Sub-schema ==========
// const PaymentDetailsSchema = new Schema({
//   // The amount paid
//   amount: { type: Number, required: true, default: 0 },

//   // Payment method: cash / bank / upi / card / netbanking / wallet / cheque
//   method: {
//     type: String,
//     enum: ["cash", "bank", "upi", "card", "netbanking", "wallet", "cheque"],
//     required: true,
//   },

//   // For 'bank' method: reference to AccountHead (bank account)
//   bankAccountId: { type: Schema.Types.ObjectId, ref: "AccountHead", default: null },

//   // For UPI / Digital payments
//   upiId: { type: String, default: null },          // e.g., supplier@ybl
//   transactionId: { type: String, default: null }, // UPI/Online transaction ref
//   paymentGateway: { type: String, default: null }, // Razorpay, PayU, etc.
//   cardLast4Digits: { type: String, default: null },
//   cardNetwork: { type: String, enum: ["Visa", "Mastercard", "Amex", "RuPay", null], default: null },

//   // For cheque
//   chequeNumber: { type: String, default: null },
//   chequeDate: { type: Date, default: null },
//   bankName: { type: String, default: null },      // alternative if no bankAccountId

//   // Common fields
//   referenceNumber: { type: String, default: null }, // generic ref (cheque no, order id, etc.)
//   paymentDate: { type: Date, required: true, default: Date.now },
//   notes: { type: String, default: null },
// }, { _id: false });

// // ========== Main Purchase Invoice Schema ==========
// const PurchaseInvoiceSchema = new Schema({
//   companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
//   createdBy: { type: Schema.Types.ObjectId, ref: "User" },

//   // Supplier details
//   supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
//   supplierCode: { type: String },
//   supplierName: { type: String },
//   contactPerson: { type: String },

//   // Document dates
//   postingDate: { type: Date, required: true },
//   validUntil: { type: Date },
//   documentDate: { type: Date },

//   // Unique invoice number (auto-generated)
//   documentNumberPurchaseInvoice: { type: String, required: true, unique: true },

//   // References
//   grn: { type: Schema.Types.ObjectId, ref: "GRN" },
//   purchaseOrder: { type: Schema.Types.ObjectId, ref: "PurchaseOrder" },

//   // Invoice type: Normal / POCopy / GRNCopy
//   invoiceType: {
//     type: String,
//     enum: ["Normal", "POCopy", "GRNCopy"],
//     default: "Normal",
//   },

//   // Items and quality
//   items: [InvoiceItemSchema],
//   qualityCheckDetails: [QualityCheckDetailSchema],

//   // Financial totals
//   totalBeforeDiscount: { type: Number, default: 0 },
//   gstTotal: { type: Number, default: 0 },
//   grandTotal: { type: Number, required: true, default: 0 },

//   // Payment tracking
//   paidAmount: { type: Number, default: 0 },
//   remainingAmount: { type: Number, default: 0 },

//   // Array of payments (supports partial, multiple payments)
//   payments: [PaymentDetailsSchema],

//   // Payment status (derived)
//   paymentStatus: {
//     type: String,
//     enum: ["Pending", "Partial", "Paid"],
//     default: "Pending",
//   },

//   // Stock and invoice status
//   stockStatus: {
//     type: String,
//     enum: ["Not Updated", "Updated", "Adjusted"],
//     default: "Not Updated",
//   },
// status: {
//   type: String,
//   enum: ["draft", "submitted", "pending", "approved", "rejected", "posted", "cancelled"],
//   default: "draft"
// },

//   // Remarks & employee
//   remarks: { type: String },
//   salesEmployee: { type: String },

//   // Attachments (Cloudinary)
//   attachments: [{
//     fileName: String,
//     fileUrl: String,
//     fileType: String,
//     uploadedAt: Date,
//     publicId: String
//   }],

// }, { timestamps: true });

// // ========== Indexes ==========
// PurchaseInvoiceSchema.index({ companyId: 1, documentNumberPurchaseInvoice: 1 }, { unique: true });
// PurchaseInvoiceSchema.index({ supplier: 1, postingDate: -1 });
// PurchaseInvoiceSchema.index({ paymentStatus: 1 });
// PurchaseInvoiceSchema.index({ "payments.transactionId": 1 }, { sparse: true });
// PurchaseInvoiceSchema.index({ "payments.chequeNumber": 1 }, { sparse: true });

// export default mongoose.models.PurchaseInvoice || mongoose.model("PurchaseInvoice", PurchaseInvoiceSchema);








// import mongoose from "mongoose";
// import Counter from "@/models/Counter";
// const { Schema } = mongoose;

// const BatchSchema = new mongoose.Schema(
//   {
//     batchNumber: { type: String },
//     expiryDate: { type: Date },
//     manufacturer: { type: String },
//     batchQuantity: { type: Number, default: 0 },
//   },
//   { _id: false }
// );

// const QualityCheckDetailSchema = new mongoose.Schema(
//   {
//     parameter: { type: String },
//     min: { type: Number },
//     max: { type: Number },
//     actualValue: { type: Number },
//   },
//   { _id: false }
// );

// // Updated Invoice Item Schema with fields from GRNItemSchema.
// const InvoiceItemSchema = new mongoose.Schema(
//   {
//     item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
//     itemCode: { type: String },
//     itemName: { type: String },
//     itemDescription: { type: String },
//     quantity: { type: Number, default: 0 },
//     allowedQuantity: { type: Number, default: 0 },
//     receivedQuantity: { type: Number, default: 0 },
//     pendingQuantity: { type: Number, default: 0 },
//     unitPrice: { type: Number, default: 0 },
//     discount: { type: Number, default: 0 },
//     freight: { type: Number, default: 0 },
//     gstRate: { type: Number, default: 0 },
//     taxOption: { type: String, enum: ["GST", "IGST"], default: "GST" },
//     priceAfterDiscount: { type: Number, default: 0 },
//     totalAmount: { type: Number, default: 0 },
//     gstAmount: { type: Number, default: 0 },
//     cgstAmount: { type: Number, default: 0 },
//     sgstAmount: { type: Number, default: 0 },
//     igstAmount: { type: Number, default: 0 },
//     tdsAmount: { type: Number, default: 0 },
//     warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
//     warehouseName: { type: String },
//     warehouseCode: { type: String },
//     stockAdded: { type: Boolean, default: false },
//     managedBy: { type: String, default: "" },
//     batches: { type: [BatchSchema], default: [] },
//     errorMessage: { type: String },
//   },
//   { _id: false }
// );

// // Updated Purchase Invoice Schema with an invoiceType field.
// const PurchaseInvoiceSchema = new mongoose.Schema(
//   {
//     companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
//     // invoiceNumber: { type: String, unique: true },
//     supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
//     supplierCode: { type: String },
//     supplierName: { type: String },
//     contactPerson: { type: String },
//     postingDate: { type: Date },
//     validUntil: { type: Date },
//     documentDate: { type: Date },
//     documentNumberPurchaseInvoice: { type: String, required: true,  }, // Unique document number for the invoice
//     grn: { type: mongoose.Schema.Types.ObjectId, ref: "GRN" },
//     purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder" },
//     // New field to distinguish invoice types:
//     // "Normal" for regular invoices,
//     // "POCopy" when copied from a Purchase Order,
//     // "GRNCopy" when copied from a GRN.
//     invoiceType: {
//       type: String,
//       enum: ["Normal", "POCopy", "GRNCopy"],
//       default: "Normal",
//     },
//     items: [InvoiceItemSchema],
//     qualityCheckDetails: { type: [QualityCheckDetailSchema], default: [] },
//     totalBeforeDiscount: { type: Number, default: 0 },
//     gstTotal: { type: Number, default: 0 },
//     grandTotal: { type: Number, default: 0 },
//     openBalance: { type: Number, default: 0 },
//     remarks: { type: String },
//     salesEmployee: { type: String },
   
//   paidAmount: { type: Number, default: 0 }, // total paid till now
//   remainingAmount: { type: Number, default: 0 }, // grandTotal - paidAmount
 
//     status: {
//       type: String
//     },
//     paymentStatus: {
//       type: String,
//       enum: ["Pending", "Partial", "Paid"],
//       default: "Pending",
//     },
//     stockStatus: {
//       type: String,
//       enum: ["Not Updated", "Updated", "Adjusted"],
//       default: "Not Updated",
//     },
//  attachments: [
//     {
//       fileName: String,
//       fileUrl: String,
//       fileType: String,
//       uploadedAt: Date,
//       publicId: String
//     }
//   ]
//   },
//   { timestamps: true }
// );

// PurchaseInvoiceSchema.index({ companyId: 1, documentNumberPurchaseInvoice: 1 }, { unique: true });


// // PurchaseInvoiceSchema.pre("save", async function (next) {
// //   if (this.documentNumberPurchaseInvoice) return next();
// //   try {
// //     const key = `purchaseInvoice${this.companyId}`;
// //   const counter = await Counter.findOneAndUpdate(
// //   { id: key, companyId: this.companyId }, // Match on both
// //   { 
// //     $inc: { seq: 1 },
// //     $setOnInsert: { companyId: this.companyId }  // Ensure it's set on insert
// //   },
// //   { new: true, upsert: true }
// // );

// //     const now = new Date();
// // const currentYear = now.getFullYear();
// // const currentMonth = now.getMonth() + 1;

// // // Calculate financial year
// // let fyStart = currentYear;
// // let fyEnd = currentYear + 1;

// // if (currentMonth < 4) {
// //   // Jan–Mar => part of previous FY
// //   fyStart = currentYear - 1;
// //   fyEnd = currentYear;
// // }

// // const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;

// // // Assuming `counter.seq` is your sequence number (e.g., 30)
// // const paddedSeq = String(counter.seq).padStart(5, '0');

// // // Generate final sales order number
// // this.documentNumberPurchaseInvoice = `PURCH-INV/${financialYear}/${paddedSeq}`;


// //     // this.salesNumber = `Sale-${String(counter.seq).padStart(3, '0')}`;
// //     next();
// //   } catch (err) {
// //     next(err);
// //   }
// // });
// // Pre-save hook to auto-generate an invoice number if missing.
// // PurchaseInvoiceSchema.pre("save", async function (next) {
// //   if (!this.invoiceNumber) {
// //     try {
// //       const counter = await Counter.findOneAndUpdate(
// //         { id: "purchaseInvoice" },
// //         { $inc: { seq: 1 } },
// //         { new: true, upsert: true }
// //       );
// //       this.invoiceNumber = `INV-${String(counter.seq).padStart(3, "0")}`;
// //     } catch (error) {
// //       return next(error);
// //     }
// //   }
// //   next();
// // });

// export default mongoose.models.PurchaseInvoice ||
//   mongoose.model("PurchaseInvoice", PurchaseInvoiceSchema);




// import mongoose from "mongoose";
// import Counter from "./Counter";

// const BatchSchema = new mongoose.Schema(
//   {
//     batchNumber: { type: String },
//     expiryDate: { type: Date },
//     manufacturer: { type: String },
//     batchQuantity: { type: Number, default: 0 },
//   },
//   { _id: false }
// );

// const QualityCheckDetailSchema = new mongoose.Schema(
//   {
//     parameter: { type: String },
//     min: { type: Number },
//     max: { type: Number },
//     actualValue: { type: Number },
//   },
//   { _id: false }
// );

// // Updated Invoice Item Schema with fields from GRNItemSchema.
// const InvoiceItemSchema = new mongoose.Schema(
//   {
//     item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
//     itemCode: { type: String },
//     itemName: { type: String },
//     itemDescription: { type: String },
//     quantity: { type: Number, default: 0 },
//     allowedQuantity: { type: Number, default: 0 },
//     receivedQuantity: { type: Number, default: 0 },
//     pendingQuantity: { type: Number, default: 0 },
//     unitPrice: { type: Number, default: 0 },
//     discount: { type: Number, default: 0 },
//     freight: { type: Number, default: 0 },
//     // Replace gstType with gstRate and add taxOption.
//     gstRate: { type: Number, default: 0 },
//     taxOption: { type: String, enum: ["GST", "IGST"], default: "GST" },
//     priceAfterDiscount: { type: Number, default: 0 },
//     totalAmount: { type: Number, default: 0 },
//     gstAmount: { type: Number, default: 0 },
//     cgstAmount: { type: Number, default: 0 },
//     sgstAmount: { type: Number, default: 0 },
//     igstAmount: { type: Number, default: 0 },
//     tdsAmount: { type: Number, default: 0 },
//     warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
//     warehouseName: { type: String },
//     warehouseCode: { type: String },
//     stockAdded: { type: Boolean, default: false },
//     managedBy: { type: String, default: "" },
//     batches: { type: [BatchSchema], default: [] },
//     errorMessage: { type: String },
//   },
//   { _id: false }
// );

// // Updated Purchase Invoice Schema
// const PurchaseInvoiceSchema = new mongoose.Schema(
//   {
//     invoiceNumber: { type: String, unique: true },
//     supplierCode: { type: String },
//     supplierName: { type: String },
//     contactPerson: { type: String },
//     postingDate: { type: Date },
//     validUntil:{ type: Date },
//     documentDate: { type: Date },
//     grn: { type: mongoose.Schema.Types.ObjectId, ref: "GRN" },
//     purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder" },
//     items: [InvoiceItemSchema],
//     qualityCheckDetails: { type: [QualityCheckDetailSchema], default: [] },
//     totalBeforeDiscount: { type: Number, default: 0 },
//     gstTotal: { type: Number, default: 0 },
//     grandTotal: { type: Number, default: 0 },
//     openBalance: { type: Number, default: 0 },
//     remarks: { type: String },
//     salesEmployee: { type: String },
//     status: {
//       type: String,
//       enum: ["Pending", "Approved", "Received", "Rejected"],
//     },
//     paymentStatus: {
//       type: String,
//       enum: ["Pending", "Partial", "Paid"],
//       default: "Pending",
//     },
//     stockStatus: {
//       type: String,
//       enum: ["Not Updated", "Updated", "Adjusted"],
//       default: "Not Updated",
//     },
//   },
//   { timestamps: true }
// );

// // Pre-save hook to auto-generate an invoice number if missing.
// PurchaseInvoiceSchema.pre("save", async function (next) {
//   if (!this.invoiceNumber) {
//     try {
//       const counter = await Counter.findOneAndUpdate(
//         { id: "purchaseInvoice" },
//         { $inc: { seq: 1 } },
//         { new: true, upsert: true }
//       );
//       this.invoiceNumber = `INV-${String(counter.seq).padStart(3, "0")}`;
//     } catch (error) {
//       return next(error);
//     }
//   }
//   next();
// });

// export default mongoose.models.PurchaseInvoice ||
//   mongoose.model("PurchaseInvoice", PurchaseInvoiceSchema);
