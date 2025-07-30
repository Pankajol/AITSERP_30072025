import mongoose from "mongoose";
import Counter from "./Counter";

const BatchSchema = new mongoose.Schema(
  {
    batchNumber: { type: String },
    expiryDate: { type: Date },
    manufacturer: { type: String },
    batchQuantity: { type: Number, default: 0 },
  },
  { _id: false }
);

const QualityCheckDetailSchema = new mongoose.Schema(
  {
    parameter: { type: String },
    min: { type: Number },
    max: { type: Number },
    actualValue: { type: Number },
  },
  { _id: false }
);

// Updated Invoice Item Schema with fields from GRNItemSchema.
const InvoiceItemSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    itemCode: { type: String },
    itemName: { type: String },
    itemDescription: { type: String },
    quantity: { type: Number, default: 0 },
    allowedQuantity: { type: Number, default: 0 },
    receivedQuantity: { type: Number, default: 0 },
    pendingQuantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    freight: { type: Number, default: 0 },
    gstRate: { type: Number, default: 0 },
    taxOption: { type: String, enum: ["GST", "IGST"], default: "GST" },
    priceAfterDiscount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    tdsAmount: { type: Number, default: 0 },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
    warehouseName: { type: String },
    warehouseCode: { type: String },
    stockAdded: { type: Boolean, default: false },
    managedBy: { type: String, default: "" },
    batches: { type: [BatchSchema], default: [] },
    errorMessage: { type: String },
  },
  { _id: false }
);

// Updated Purchase Invoice Schema with an invoiceType field.
const PurchaseInvoiceSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
    // invoiceNumber: { type: String, unique: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    supplierCode: { type: String },
    supplierName: { type: String },
    contactPerson: { type: String },
    postingDate: { type: Date },
    validUntil: { type: Date },
    documentDate: { type: Date },
    documentNumber: { type: String, unique: true }, // Unique document number for the invoice
    grn: { type: mongoose.Schema.Types.ObjectId, ref: "GRN" },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder" },
    // New field to distinguish invoice types:
    // "Normal" for regular invoices,
    // "POCopy" when copied from a Purchase Order,
    // "GRNCopy" when copied from a GRN.
    invoiceType: {
      type: String,
      enum: ["Normal", "POCopy", "GRNCopy"],
      default: "Normal",
    },
    items: [InvoiceItemSchema],
    qualityCheckDetails: { type: [QualityCheckDetailSchema], default: [] },
    totalBeforeDiscount: { type: Number, default: 0 },
    gstTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    openBalance: { type: Number, default: 0 },
    remarks: { type: String },
    salesEmployee: { type: String },
   
  paidAmount: { type: Number, default: 0 }, // total paid till now
  remainingAmount: { type: Number, default: 0 }, // grandTotal - paidAmount
 
    status: {
      type: String,
      enum: ["Pending", "Approved", "Received", "Rejected"],
    },
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
 attachments: [
    {
      fileName: String,
      fileUrl: String,
      fileType: String,
      uploadedAt: Date,
      publicId: String
    }
  ]
  },
  { timestamps: true }
);


PurchaseInvoiceSchema.pre("save", async function (next) {
  if (this.documentNumber) return next();
  try {
    const key = `purchaseInvoice${this.companyId}`;
    const counter = await Counter.findOneAndUpdate(
      { id: key },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;

// Calculate financial year
let fyStart = currentYear;
let fyEnd = currentYear + 1;

if (currentMonth < 4) {
  // Jan–Mar => part of previous FY
  fyStart = currentYear - 1;
  fyEnd = currentYear;
}

const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;

// Assuming `counter.seq` is your sequence number (e.g., 30)
const paddedSeq = String(counter.seq).padStart(5, '0');

// Generate final sales order number
this.documentNumber = `PURCH-INV/${financialYear}/${paddedSeq}`;


    // this.salesNumber = `Sale-${String(counter.seq).padStart(3, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});
// Pre-save hook to auto-generate an invoice number if missing.
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

export default mongoose.models.PurchaseInvoice ||
  mongoose.model("PurchaseInvoice", PurchaseInvoiceSchema);




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
