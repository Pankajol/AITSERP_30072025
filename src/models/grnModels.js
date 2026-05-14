import mongoose from 'mongoose';

// Batch sub‑schema
const BatchSchema = new mongoose.Schema({
  batchNumber: { type: String },
  expiryDate: { type: Date },
  manufacturer: { type: String },
  batchQuantity: { type: Number, default: 0 },
}, { _id: false });

// Quality Check sub‑schema
const QualityCheckDetailSchema = new mongoose.Schema({
  parameter: { type: String },
  min: { type: Number },
  max: { type: Number },
  actualValue: { type: Number },
}, { _id: false });

// GRN item schema – includes variant support
const GRNItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  itemCode: { type: String },
  itemName: { type: String },
  itemDescription: { type: String },
  quantity: { type: Number, default: 0 },
  allowedQuantity: { type: Number, default: 0 },
  receivedQuantity: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  freight: { type: Number, default: 0 },
  gstRate: { type: Number, default: 0 },
  igstRate: { type: Number, default: 0 },
  taxOption: { type: String, enum: ['GST', 'IGST'], default: 'GST' },
  priceAfterDiscount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  managedBy: { type: String, default: 'batch' },
  batches: { type: [BatchSchema], default: [] },
  qualityCheckDetails: { type: [QualityCheckDetailSchema], default: [] },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  warehouseName: { type: String },
  warehouseCode: { type: String },
  stockAdded: { type: Boolean, default: false },
  errorMessage: { type: String },

  // ✅ Variant support (same structure as Purchase Order)
  variant: {
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant' },
    sku: { type: String },
    attributes: { type: Object, default: {} },
    variantPrice: { type: Number },
    variantImageUrl: { type: String },
    variantBarcode: { type: String }
  },
  selectedVariantId: { type: String, default: null }
}, { _id: false });

// Main GRN schema
const GRNSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  purchaseOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    default: null,
    set: (v) => (v === "" || v === null ? null : v)
  
  },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierCode: { type: String },
  supplierName: { type: String },
  contactPerson: { type: String },
  refNumber: { type: String },
  documentNumberGrn: { type: String, required: true, unique: true },
  status: { type: String, default: 'Received' },
  postingDate: { type: Date },
  validUntil: { type: Date },
  documentDate: { type: Date },
  items: { type: [GRNItemSchema], default: [] },
  qualityCheckDetails: { type: [QualityCheckDetailSchema], default: [] },
  salesEmployee: { type: String },
  remarks: { type: String },
  freight: { type: Number, default: 0 },
  rounding: { type: Number, default: 0 },
  totalBeforeDiscount: { type: Number, default: 0 },
  gstTotal: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

GRNSchema.index({ companyId: 1, documentNumberGrn: 1 }, { unique: true });

export default mongoose.models.GRN || mongoose.model('GRN', GRNSchema);



// import mongoose from 'mongoose';
// import Counter from "@/models/Counter";
// const { Schema } = mongoose;


// // Batch sub-schema
// const BatchSchema = new mongoose.Schema({
//   batchNumber: { type: String },
//   expiryDate: { type: Date },
//   manufacturer: { type: String },
//   batchQuantity: { type: Number, default: 0 },
// }, { _id: false });

// // Quality Check sub-schema
// const QualityCheckDetailSchema = new mongoose.Schema({
//   parameter: { type: String },
//   min: { type: Number },
//   max: { type: Number },
//   actualValue: { type: Number },
// }, { _id: false });

// // GRN item schema
// const GRNItemSchema = new mongoose.Schema({
//   item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
//   itemCode: { type: String },
//   itemName: { type: String },
//   itemDescription: { type: String },
//   quantity: { type: Number, default: 0 },
//   allowedQuantity: { type: Number, default: 0 },
//   receivedQuantity: { type: Number, default: 0 },
//   unitPrice: { type: Number, default: 0 },
//   discount: { type: Number, default: 0 },
//   freight: { type: Number, default: 0 },
//   gstRate: { type: Number, default: 0 },
//   igstRate: { type: Number, default: 0 }, // ✅ FIXED: added igstRate
//   taxOption: { type: String, enum: ['GST', 'IGST'], default: 'GST' },
//   priceAfterDiscount: { type: Number, default: 0 },
//   totalAmount: { type: Number, default: 0 },
//   gstAmount: { type: Number, default: 0 },
//   cgstAmount: { type: Number, default: 0 },
//   sgstAmount: { type: Number, default: 0 },
//   igstAmount: { type: Number, default: 0 },
//   managedBy: { type: String, default: 'batch' },
//   batches: { type: [BatchSchema], default: [] },
//     qualityCheckDetails: { type: [QualityCheckDetailSchema], default: [] },
//     warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
//     warehouseName: { type: String },
//     warehouseCode: { type: String },
//     stockAdded: { type: Boolean, default: false },
//   errorMessage: { type: String }
// }, { _id: false });

// // Full GRN schema
// const GRNSchema = new mongoose.Schema({
//   //company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
//     companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User"}, 
//   // ✅ RECOMMENDED: ensure every GRN is linked to a Purchase Order
//   purchaseOrderId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'PurchaseOrder',
//     default: null,
//     set: (v) => (v === "" || v === null ? null : v) // Convert empty string to null
//    // ✅ RECOMMENDED: ensure every GRN is linked to a PO
//   },
//   supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
//   supplierCode: { type: String },
//   supplierName: { type: String },
//   contactPerson: { type: String },
//   refNumber: { type: String },
//    documentNumberGrn: { type: String, required: true},
//   status: { type: String, default: 'Received' },
//   postingDate: { type: Date },
//   validUntil: { type: Date },
//   documentDate: { type: Date },
//   items: { type: [GRNItemSchema], default: [] },
//   qualityCheckDetails: { type: [QualityCheckDetailSchema], default: [] },
//   salesEmployee: { type: String },
//   remarks: { type: String },
//   freight: { type: Number, default: 0 },
//   rounding: { type: Number, default: 0 },
//   totalBeforeDiscount: { type: Number, default: 0 },
//   gstTotal: { type: Number, default: 0 },
//   grandTotal: { type: Number, default: 0 },
//    attachments: [
//       {
//         fileName: String,
//         fileUrl: String, // e.g., /uploads/somefile.pdf
//         fileType: String,
//         uploadedAt: { type: Date, default: Date.now },
//       },
//     ],
// }, { timestamps: true });

// GRNSchema.index({ companyId: 1, documentNumberGrn: 1 }, { unique: true });

