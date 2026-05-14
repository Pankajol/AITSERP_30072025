import mongoose from "mongoose";
import Counter from "@/models/Counter"; // if you use auto‑increment

const { Schema } = mongoose;

const BatchSchema = new Schema({
  batchNumber: { type: String, trim: true },
  expiryDate: { type: Date },
  manufacturer: { type: String, trim: true },
  batchQuantity: { type: Number, default: 0, min: 0 },
}, { _id: false });

const QualityCheckDetailSchema = new Schema({
  parameter: { type: String, trim: true },
  min: { type: Number },
  max: { type: Number },
  actualValue: { type: Number },
}, { _id: false });

const VariantReferenceSchema = new Schema({
  variantId: { type: Schema.Types.ObjectId, required: true },
  sku: { type: String, trim: true },
  attributes: { type: Map, of: String, default: {} },
  variantPrice: { type: Number, min: 0 },
  variantImageUrl: { type: String, trim: true },
  variantBarcode: { type: String, trim: true },
}, { _id: false });

const QuotationItemSchema = new Schema({
  item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
  
  itemCode: { type: String, trim: true },
  itemName: { type: String, trim: true },
  itemDescription: { type: String, trim: true },
  hsnCode: { type: String, trim: true },               // ✅ new
  unit: { type: String, trim: true },                  // ✅ new
  quantity: { type: Number, default: 0, min: 0 },
  orderedQuantity: { type: Number, default: 0, min: 0 },
  unitPrice: { type: Number, default: 0, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  discountType: { type: String, enum: ["percentage", "fixed"], default: "percentage" }, // ✅ new
  freight: { type: Number, default: 0, min: 0 },
  gstRate: { type: Number, default: 0, min: 0, max: 100 },
  taxOption: { type: String, enum: ["GST", "IGST"], default: "GST" },
  cess: { type: Number, default: 0, min: 0 },          // ✅ new
  taxInclusive: { type: Boolean, default: false },     // ✅ new
  priceAfterDiscount: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, default: 0, min: 0 },
  gstAmount: { type: Number, default: 0, min: 0 },
  cgstAmount: { type: Number, default: 0, min: 0 },
  sgstAmount: { type: Number, default: 0, min: 0 },
  igstAmount: { type: Number, default: 0, min: 0 },
  tdsAmount: { type: Number, default: 0, min: 0 },
  warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse" },
  warehouseName: { type: String, trim: true },
  warehouseCode: { type: String, trim: true },
  stockAdded: { type: Boolean, default: false },
  managedBy: { type: String, trim: true },
  batches: { type: [BatchSchema], default: [] },
  qualityCheckDetails: { type: [QualityCheckDetailSchema], default: [] },
  removalReason: { type: String, trim: true },
  variant: { type: VariantReferenceSchema, default: null }, // ✅ variant selection
}, { _id: false });

const PurchaseQuotationSchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
  supplierCode: { type: String, trim: true },
  supplierName: { type: String, required: true, trim: true },
  contactPerson: { type: String, trim: true },
  refNumber: { type: String, trim: true },
  documentNumber: { type: String, required: true, unique: false },
  status: {
    type: String,
    enum: ["Open", "CopiedToOrder", "ConvertedToOrder", "PartiallyOrdered", "FullyOrdered"],
    default: "Open",
  },
  postingDate: { type: Date, default: Date.now },
  validUntil: { type: Date },
  documentDate: { type: Date, default: Date.now },
  items: { type: [QuotationItemSchema], default: [] },
  salesEmployee: { type: String, trim: true },
  remarks: { type: String, trim: true },
  termsAndConditions: { type: String, trim: true },    // ✅ new
  freight: { type: Number, default: 0, min: 0 },
  rounding: { type: Number, default: 0 },
  totalBeforeDiscount: { type: Number, default: 0, min: 0 },
  totalDownPayment: { type: Number, default: 0, min: 0 },
  appliedAmounts: { type: Number, default: 0, min: 0 },
  gstTotal: { type: Number, default: 0, min: 0 },
  grandTotal: { type: Number, default: 0, min: 0 },
  openBalance: { type: Number, default: 0, min: 0 },
  invoiceType: { type: String, enum: ["Normal", "POCopy", "GRNCopy"], default: "Normal" },
  currency: { type: String, default: "INR" },          // ✅ new
  exchangeRate: { type: Number, default: 1 },          // ✅ new
  attachments: [{
    fileName: { type: String, trim: true },
    fileUrl: { type: String, trim: true },
    fileType: { type: String, trim: true },
    uploadedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

// Indexes
PurchaseQuotationSchema.index({ companyId: 1, documentNumber: 1 }, { unique: true });
PurchaseQuotationSchema.index({ supplier: 1 });
PurchaseQuotationSchema.index({ status: 1 });
PurchaseQuotationSchema.index({ postingDate: -1 });
PurchaseQuotationSchema.index({ "items.variant.variantId": 1 }); // for variant lookups

export default mongoose.models.PurchaseQuotation ||
  mongoose.model("PurchaseQuotation", PurchaseQuotationSchema);




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

// const PurchaseQuotationSchema = new mongoose.Schema(
//   {
//     companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User"}, 
//     supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true }, // Ensure supplier, not supplire
//     supplierCode: { type: String },
//     supplierName: { type: String, required: true },
//     contactPerson: { type: String },
//     refNumber: { type: String },
//      documentNumber: { type: String, required: true, },
//    status: {
//   type: String,
//   enum: ["Open", "CopiedToOrder", "ConvertedToOrder", "PartiallyOrdered", "FullyOrdered"], // ✅ PQ only
// },
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
//     invoiceType: { type: String, enum: ["Normal", "POCopy", "GRNCopy"], default: "Normal" },
//      attachments: [
//           {
//             fileName: String,
//             fileUrl: String, // e.g., /uploads/somefile.pdf
//             fileType: String,
//             uploadedAt: { type: Date, default: Date.now },
//           },
//         ],
// },
//   { timestamps: true }
// );

//   PurchaseQuotationSchema.index({ companyId: 1, documentNumber: 1 }, { unique: true });
