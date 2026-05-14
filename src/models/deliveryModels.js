import mongoose from "mongoose";
import Counter from "@/models/Counter";

const { Schema } = mongoose;

// Batch sub‑schema (if needed)
const BatchSchema = new Schema({
  batchCode: { type: String },
  expiryDate: { type: Date },
  manufacturer: { type: String },
  allocatedQuantity: { type: Number, default: 0 },
  availableQuantity: { type: Number, default: 0 },
}, { _id: false });

// Item sub‑schema with variant and warehouse support
const ItemSchema = new Schema({
  item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
  imageUrl: { type: String, default: "" },
  itemCode: { type: String },
  itemName: { type: String },
  itemDescription: { type: String },
  quantity: { type: Number, required: true },
  orderedQuantity: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  freight: { type: Number, default: 0 },
  gstRate: { type: Number, default: 0 },
  igstRate: { type: Number, default: 0 },
  taxOption: { type: String, enum: ["GST", "IGST"], default: "GST" },
  priceAfterDiscount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  tdsAmount: { type: Number, default: 0 },
  warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
  warehouseName: { type: String },
  warehouseCode: { type: String },
  selectedBin: { type: Schema.Types.ObjectId, ref: "Bin" }, // for bin‑level stock
  managedByBatch: { type: Boolean, default: true },
  batches: [BatchSchema],
  // Variant support
  variant: {
    variantId: { type: Schema.Types.ObjectId, ref: "Variant" },
    sku: { type: String },
    attributes: { type: Object, default: {} },
    variantPrice: { type: Number },
    variantImageUrl: { type: String },
    variantBarcode: { type: String }
  },
  selectedVariantId: { type: String, default: null },
  removalReason: { type: String },
}, { _id: false });

const DeliverySchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  branchId: { type: Schema.Types.ObjectId, ref: "Branch" },
  deliveryType: { type: String },
  deliveryDate: { type: Date, required: true },
  deliveryNumber: { type: String },
  documentNumberDelivery: { type: String, required: true, unique: true },
  salesOrderId: { type: Schema.Types.ObjectId, ref: "SalesOrder" },
  customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
  customerCode: { type: String },
  customerName: { type: String },
  contactPerson: { type: String },
  refNumber: { type: String },
  salesEmployee: { type: String },
  status: { type: String, default: "Pending" },
  orderDate: { type: Date },
  expectedDeliveryDate: { type: Date },
  items: [ItemSchema],
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
  sourceId: { type: Schema.Types.ObjectId, refPath: "sourceModel" },
  sourceModel: { type: String, default: "SalesOrder" },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedAt: { type: Date, default: Date.now },
    publicId: String,
  }]
}, { timestamps: true });

DeliverySchema.index({ documentNumberDelivery: 1, companyId: 1 }, { unique: true });

export default mongoose.models.Delivery || mongoose.model("Delivery", DeliverySchema);
// import mongoose from 'mongoose';

// const ItemSchema = new mongoose.Schema({
//   itemCode: { type: String },
//   itemName:{type: String},
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
// });

// const SalesDeliverySchema = new mongoose.Schema({
//   supplierCode: { type: String },
//   supplierName: { type: String },
//   contactPerson: { type: String },
//   refNumber: { type: String },
//   status: { 
//     type: String, 
//     enum: ["Pending", "Partially Delivered", "Delivered"],
//     default: "Pending"
//   },
//   postingDate: { type: Date },
//   validUntil: { type: Date },
//   documentDate: { type: Date },
//   items: [ItemSchema],
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
// }, {
//   timestamps: true,
// });

// export default mongoose.models.SalesDelivery || mongoose.model('SalesDelivery', SalesDeliverySchema);