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

const QuotationItemSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    itemCode: { type: String },
    itemName: { type: String },
    itemDescription: { type: String },
    quantity: { type: Number, default: 0 },
    orderedQuantity: { type: Number, default: 0 },
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
    managedBy: { type: String },
    batches: { type: [BatchSchema], default: [] },
    qualityCheckDetails: { type: [QualityCheckDetailSchema], default: [] },
    removalReason: { type: String },
  },
  { _id: false }
);

const PurchaseQuotationSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User"}, 
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true }, // Ensure supplier, not supplire
    supplierCode: { type: String },
    supplierName: { type: String, required: true },
    contactPerson: { type: String },
    refNumber: { type: String },
     documentNumber: { type: String, unique: true },
   status: {
  type: String,
  enum: ["Open", "CopiedToOrder", "ConvertedToOrder", "PartiallyOrdered", "FullyOrdered"], // ✅ PQ only
},
    postingDate: { type: Date },
    validUntil: { type: Date },
    documentDate: { type: Date },
    items: { type: [QuotationItemSchema], default: [] },
    salesEmployee: { type: String },
    remarks: { type: String },
    freight: { type: Number, default: 0 },
    rounding: { type: Number, default: 0 },
    totalBeforeDiscount: { type: Number, default: 0 },
    totalDownPayment: { type: Number, default: 0 },
    appliedAmounts: { type: Number, default: 0 },
    gstTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    openBalance: { type: Number, default: 0 },
    invoiceType: { type: String, enum: ["Normal", "POCopy", "GRNCopy"], default: "Normal" },
     attachments: [
          {
            fileName: String,
            fileUrl: String, // e.g., /uploads/somefile.pdf
            fileType: String,
            uploadedAt: { type: Date, default: Date.now },
          },
        ],
},
  { timestamps: true }
);



PurchaseQuotationSchema.pre("save", async function (next) {
  if (this.documentNumber) return next();
  try {
    const key = `PurchaseQuotation_${this.companyId}`;
 const counter = await Counter.findOneAndUpdate(
  { id: key, companyId: this.companyId }, // Match on both
  { 
    $inc: { seq: 1 },
    $setOnInsert: { companyId: this.companyId }  // Ensure it's set on insert
  },
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
this.documentNumber = `PURCH-QUO/${financialYear}/${paddedSeq}`;


    // this.salesNumber = `Sale-${String(counter.seq).padStart(3, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});
// PurchaseQuotationSchema.pre("save", async function (next) {
//   if (!this.documentNumber) {
//     try {
//       const counter = await Counter.findOneAndUpdate(
//         { id: "purchaseQuotation" },
//         { $inc: { seq: 1 } },
//         { new: true, upsert: true }
//       );
//       this.documentNumber = `PQ-${String(counter.seq).padStart(3, "0")}`;
//     } catch (error) {
//       return next(error);
//     }
//   }
//   next();
// });

export default mongoose.models.PurchaseQuotation ||
  mongoose.model("PurchaseQuotation", PurchaseQuotationSchema);


// import mongoose from "mongoose";
// import Counter from "./Counter"; // Make sure your Counter model is defined

// // Schema for batch details (embedded, no separate _id)
// const BatchSchema = new mongoose.Schema(
//   {
//     batchNumber: { type: String },
//     expiryDate: { type: Date },
//     manufacturer: { type: String },
//     batchQuantity: { type: Number, default: 0 },
//   },
//   { _id: false }
// );

// // Schema for quality check details (embedded, no separate _id)
// const QualityCheckDetailSchema = new mongoose.Schema(
//   {
//     parameter: { type: String },
//     min: { type: Number },
//     max: { type: Number },
//     actualValue: { type: Number },
//   },
//   { _id: false }
// );

// // Schema for each quotation item.
// const QuotationItemSchema = new mongoose.Schema(
//   {
//     item: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
//     itemCode: { type: String },
//     itemName: { type: String },
//     itemDescription: { type: String },
//     quantity: { type: Number, default: 0 },
//     orderedQuantity: { type: Number, default: 0 },
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
//     managedBy: { type: String },
//     batches: { type: [BatchSchema], default: [] },
//     qualityCheckDetails: { type: [QualityCheckDetailSchema], default: [] },
//     removalReason: { type: String },
//   },
//   { _id: false }
// );

// // Schema for the Purchase Quotation.
// const PurchaseQuotationSchema = new mongoose.Schema(
//   {
//     supplire:{ type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
//     supplierCode: { type: String },
//     supplierName: { type: String, required: true },
//     contactPerson: { type: String },
//     refNumber: { type: String, unique: true },
//     status: { type: String, default: "Open" },
//     postingDate: { type: Date },
//     validUntil: { type: Date },
//     documentDate: { type: Date },
//     items: { type: [QuotationItemSchema], default: [] },
//     salesEmployee: { type: String },
//     remarks: { type: String },
//     freight: { type: Number, default: 0 },
//     rounding: { type: Number, default: 0 },
//     totalBeforeDiscount: { type: Number, default: 0 },
//     totalDownPayment: { type: Number, default: 0 },
//     appliedAmounts: { type: Number, default: 0 },
//     gstTotal: { type: Number, default: 0 },
//     grandTotal: { type: Number, default: 0 },
//     openBalance: { type: Number, default: 0 },
//     // invoiceType helps differentiate the source of the quotation.
//     invoiceType: { type: String, enum: ["Normal", "POCopy", "GRNCopy"], default: "Normal" },
//   },
//   { timestamps: true }
// );

// // Pre-save hook to auto-generate refNumber if missing.
// PurchaseQuotationSchema.pre("save", async function (next) {
//   if (!this.refNumber) {
//     try {
//       const counter = await Counter.findOneAndUpdate(
//         { id: "purchaseQuotation" },
//         { $inc: { seq: 1 } },
//         { new: true, upsert: true }
//       );
//       this.refNumber = `PQ-${String(counter.seq).padStart(3, "0")}`;
//     } catch (error) {
//       return next(error);
//     }
//   }
//   next();
// });

// export default mongoose.models.PurchaseQuotation ||
//   mongoose.model("PurchaseQuotation", PurchaseQuotationSchema);
