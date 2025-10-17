import mongoose from "mongoose";
import Counter from "@/models/Counter";
import Coustomer from "@/models/CustomerModel";
import { type } from "os";


const { Schema } = mongoose;

// Schema for batch details (embedded, no separate _id)
const BatchSchema = new Schema(
  {
    batchCode: { type: String },
    expiryDate: { type: Date },
    manufacturer: { type: String },
    allocatedQuantity: { type: Number, default: 0 },
    availableQuantity: { type: Number, default: 0 }
  },
  { _id: false }
);

// Schema for each Sales Invoice item.
const SalesInvoiceItemSchema = new Schema(
  {
    item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
    itemCode: { type: String, required: true },
    itemName: { type: String, required: true },
    itemId: { type: String },
    itemDescription: { type: String },
    quantity: { type: Number, required: true },
    allowedQuantity: { type: Number, default: 0 },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    freight: { type: Number, default: 0 },
    gstRate: { type: Number, default: 0 },
    gstType: { type: Number, default: 0 },  // You may use gstRate instead if preferred.
    priceAfterDiscount: { type: Number, required: true },
     
     
      cgstAmount: { type: Number, default: 0 },
      sgstAmount: { type: Number, default: 0 },
      
    totalAmount: { type: Number, required: true },
    gstAmount: { type: Number, default: 0 },
    tdsAmount: { type: Number, default: 0 },
    batches: { type: [BatchSchema], default: [] },
    warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
    warehouseName: { type: String, required: true },
    warehouseCode: { type: String, required: true },
    warehouseId: { type: String },
    errorMessage: { type: String },
    taxOption: { type: String, enum: ["GST", "IGST"], default: "GST" },
    igstAmount: { type: Number, default: 0 },
    managedByBatch: { type: Boolean, default: true },
    managedBy: { type: String }
  },
  { _id: false }
);

// Schema for Sales Invoice.
const SalesInvoiceSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch"},
    branchName: { type: String,  },
    branchCode: { type: String,  },
    // documentNumberSalesInvoice :{type: String , required: true},
    invoiceNumber: { type: String, required: true},
    postingDate: { type: Date,},
    invoiceDate: { type: Date,  },
    customer: { type: Schema.Types.ObjectId, ref: "Customer" },
    customerCode: { type: String, required: true },
    customerName: { type: String, required: true },
    contactPerson: { type: String },
    refNumber: { type: String },
    salesEmployee: { type: String },
    status: { type: String, enum: ["Pending", "Confirmed"], default: "Pending" },
    orderDate: { type: Date },
    expectedDeliveryDate: { type: Date },
    items: { type: [SalesInvoiceItemSchema], required: true },
    remarks: { type: String },
    freight: { type: Number, default: 0 },
    rounding: { type: Number, default: 0 },
    totalDownPayment: { type: Number, default: 0 },
    appliedAmounts: { type: Number, default: 0 },
    totalBeforeDiscount: { type: Number, required: true },
    gstTotal: { type: Number, required: true },
    grandTotal: { type: Number, required: true },
    openBalance: { type: Number, required: true },
    fromQuote: { type: Boolean, default: false },
    paidAmount: { type: Number, default: 0 }, // total paid till now
    remainingAmount: { type: Number, default: 0 }, // grandTotal - paidAmount
    paymentStatus: {
      type: String,
      enum: ["Pending", "Partial", "Paid"],
      default: "Pending",
    },
    // For handling copies:
    sourceId: { type: Schema.Types.ObjectId },
    sourceModel: { type: String, enum: ["salesorder", "delivery"] },
    attachments: [
      { 
       
       fileName: String,
        fileUrl: String, // e.g., /uploads/somefile.pdf
        fileType: String,
        uploadedAt: { type: Date, default: Date.now },
      }
    ]
  },
  { timestamps: true }
);

SalesInvoiceSchema.index({ invoiceNumber: 1, companyId: 1 }, { unique: true });


/* per‑tenant auto‑increment */
// SalesInvoiceSchema.pre("save", async function (next) {
//   if (this.invoiceNumber) return next();
//   try {
//     const key = `salesInvoice${this.companyId}`;
//   const counter = await Counter.findOneAndUpdate(
//   { id: key, companyId: this.companyId }, // Match on both
//   { 
//     $inc: { seq: 1 },
//     $setOnInsert: { companyId: this.companyId }  // Ensure it's set on insert
//   },
//   { new: true, upsert: true }
// );

//     const now = new Date();
// const currentYear = now.getFullYear();
// const currentMonth = now.getMonth() + 1;

// // Calculate financial year
// let fyStart = currentYear;
// let fyEnd = currentYear + 1;

// if (currentMonth < 4) {
//   // Jan–Mar => part of previous FY
//   fyStart = currentYear - 1;
//   fyEnd = currentYear;
// }

// const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;

// // Assuming `counter.seq` is your sequence number (e.g., 30)
// const paddedSeq = String(counter.seq).padStart(5, '0');

// // Generate final sales order number
// this.invoiceNumber = `Sal-INV/${financialYear}/${paddedSeq}`;


//     // this.salesNumber = `Sale-${String(counter.seq).padStart(3, '0')}`;
//     next();
//   } catch (err) {
//     next(err);
//   }
// });


export default mongoose.models.SalesInvoice || mongoose.model("SalesInvoice", SalesInvoiceSchema);


// import mongoose from 'mongoose';

// const SalesInvoiceItemSchema = new mongoose.Schema({
//   item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
//   itemCode: { type: String },
//   itemName: { type: String },
//   itemDescription: { type: String },
//   quantity: { type: Number, default: 0 },
//   unitPrice: { type: Number, default: 0 },
//   discount: { type: Number, default: 0 },
//   freight: { type: Number, default: 0 },
//   gstType: { type: Number, default: 0 },
//   priceAfterDiscount: { type: Number, default: 0 },
//   totalAmount: { type: Number, default: 0 },
//   gstAmount: { type: Number, default: 0 },
//   tdsAmount: { type: Number, default: 0 },
//   // Make warehouse optional (or set a default if needed)
//   warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: false },
//   warehouseName: { type: String },
//   warehouseCode: { type: String },
// }, { _id: false });

// const SalesInvoiceSchema = new mongoose.Schema({
//   customerCode: { type: String },
//   customerName: { type: String },
//   contactPerson: { type: String },
//   refNumber: { type: String },
//   // Allowed statuses include "Open"
//   status: { 
//     type: String, 
//     enum: ["Pending", "Paid", "Cancelled", "Open"], 
//     default: "Open" 
//   },
//   postingDate: { type: Date },
//   invoiceDate: { type: Date },
//   items: [SalesInvoiceItemSchema],
//   salesEmployee: { type: String },
//   remarks: { type: String },
//   freight: { type: Number, default: 0 },
//   rounding: { type: Number, default: 0 },
//   totalBeforeDiscount: { type: Number, default: 0 },
//   totalDownPayment: { type: Number, default: 0 },
//   appliedAmounts: { type: Number, default: 0 },
//   gstTotal: { type: Number, default: 0 },
//   grandTotal: { type: Number, default: 0 },
//   openBalance: { type: Number, default: 0 },
// }, { timestamps: true });

// export default mongoose.models.SalesInvoice || mongoose.model('SalesInvoice', SalesInvoiceSchema);
