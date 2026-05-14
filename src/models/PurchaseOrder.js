import mongoose from 'mongoose';
import Counter from "@/models/Counter";
const { Schema } = mongoose;

// Optional: Remove this if you don't need batch management
const BatchSchema = new mongoose.Schema({
  batchNumber: { type: String },
  expiryDate: { type: Date },
  manufacturer: { type: String },
  batchQuantity: { type: Number, default: 0 },
}, { _id: false });

const QualityCheckDetailSchema = new mongoose.Schema({
  parameter: { type: String },
  min: { type: Number },
  max: { type: Number },
  actualValue: { type: Number },
}, { _id: false });

const OrderItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  itemCode: { type: String },
  itemName: { type: String },
  orderedQuantity: { type: Number, default: 0 },
  receivedQuantity: { type: Number, default: 0 },
  itemDescription: { type: String, default: "" },
  
  // Image URL for the item (or variant)
  imageUrl: { type: String, default: "" },
  
  quantity: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  freight: { type: Number, default: 0 },
  
  gstRate: { type: Number, default: 0 },
  taxOption: { type: String, enum: ['GST', 'IGST'], default: 'GST' },
  cess: { type: Number, default: 0 },
  taxInclusive: { type: Boolean, default: false },
  
  priceAfterDiscount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  tdsAmount: { type: Number, default: 0 },
  
  managedBy: { type: String, default: "" },
  batches: { type: [BatchSchema], default: [] },
  qualityCheckDetails: { type: [QualityCheckDetailSchema], default: [] },
  
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  warehouseName: { type: String, default: "" },
  warehouseCode: { type: String, default: "" },
  stockAdded: { type: Boolean, default: false },
  managedByBatch: { type: Boolean, default: true },
  
  // Variant information
  variant: {
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant' },
    sku: { type: String },
    attributes: { type: Object, default: {} },
    variantPrice: { type: Number },
    variantImageUrl: { type: String },
    variantBarcode: { type: String }
  },
  selectedVariantId: { type: String, default: null },
  
  // Additional fields
  removalReason: { type: String, default: "" },
  isNewItem: { type: Boolean, default: false }
}, { _id: false });

const PurchaseOrderSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  purchasequotation: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseQuotation' },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  supplierCode: { type: String, default: "" },
  supplierName: { type: String, default: "" },
  contactPerson: { type: String, default: "" },
  refNumber: { type: String, default: "" },
  documentNumberPurchaseOrder: { type: String, required: true, unique: true },
  
  // Status fields
  orderStatus: { 
    type: String, 
    enum: ["Open", "Closed", "Cancelled", "CopiedToOrder", "Pending", "FullyOrdered", "PartiallyOrdered","FullyReceived","PartiallyReceived" ],
    default: "Open" 
  },
  paymentStatus: { 
    type: String, 
    enum: ["Pending", "Partial", "Paid"],
    default: "Pending" 
  },
  stockStatus: { 
    type: String, 
    enum: ["Not Updated", "Updated", "Adjusted"],
    default: "Not Updated" 
  },
  
  // Dates
  postingDate: { type: Date, default: Date.now },
  validUntil: { type: Date },
  documentDate: { type: Date, default: Date.now },
  
  // Items array
  items: [OrderItemSchema],
  
  // Staff & remarks
  salesEmployee: { type: String, default: "" },
  remarks: { type: String, default: "" },
  
  // Financial fields
  freight: { type: Number, default: 0 },
  rounding: { type: Number, default: 0 },
  totalBeforeDiscount: { type: Number, default: 0 },
  totalDownPayment: { type: Number, default: 0 },
  appliedAmounts: { type: Number, default: 0 },
  gstTotal: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  openBalance: { type: Number, default: 0 },
  
  // Currency fields
  currency: { type: String, default: "INR" },
  exchangeRate: { type: Number, default: 1 },
  
  // Attachments
  attachments: [{
    fileName: { type: String },
    fileUrl: { type: String },
    fileType: { type: String },
    cloudinaryId: { type: String },
    uploadedAt: { type: Date, default: Date.now },
  }],
  
}, {
  timestamps: true,
});

// Create compound index for companyId and documentNumberPurchaseOrder
PurchaseOrderSchema.index({ companyId: 1, documentNumberPurchaseOrder: 1 }, { unique: true });

// Pre-save middleware to generate document number if not provided
PurchaseOrderSchema.pre('save', async function(next) {
  if (!this.documentNumberPurchaseOrder) {
    try {
      const Counter = mongoose.model('Counter');
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      let fyStart = currentYear;
      if (currentMonth < 4) fyStart = currentYear - 1;
      const financialYear = `${fyStart}-${String(fyStart + 1).slice(-2)}`;
      const key = "PurchaseOrder";

      const counter = await Counter.findOneAndUpdate(
        { id: key, companyId: this.companyId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      const paddedSeq = String(counter.seq).padStart(5, "0");
      this.documentNumberPurchaseOrder = `PO/${financialYear}/${paddedSeq}`;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Prevent model recompilation error in Next.js hot reload
const PurchaseOrder = mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', PurchaseOrderSchema);

export default PurchaseOrder;



// import mongoose from 'mongoose';
// import Counter from "@/models/Counter";
// const { Schema } = mongoose;


// // If you don't need batch management, you can remove BatchSchema entirely.
// const BatchSchema = new mongoose.Schema({
//   batchNumber: { type: String },
//   expiryDate: { type: Date },
//   manufacturer: { type: String },
//   batchQuantity: { type: Number, default: 0 },
// }, { _id: false });

// const QualityCheckDetailSchema = new mongoose.Schema({
//   parameter: { type: String },
//   min: { type: Number },
//   max: { type: Number },
//   actualValue: { type: Number },
// }, { _id: false });

// const OrderItemSchema = new mongoose.Schema({
//   item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
//   itemCode: { type: String },
//   itemName: { type: String },
//   orderedQuantity: { type: Number },
//   receivedQuantity: { type: Number, default: 0 },
//   itemDescription: { type: String },

//   // We'll use "quantity" as the final quantity used in GRN calculations.
//   quantity: { type: Number, default: 0 },
//   unitPrice: { type: Number, default: 0 },
//   discount: { type: Number, default: 0 },
//   freight: { type: Number, default: 0 },
//   // Replace gstType with gstRate and taxOption
//   gstRate: { type: Number, default: 0 },
//   taxOption: { type: String, enum: ['GST', 'IGST'], default: 'GST' },
//   priceAfterDiscount: { type: Number, default: 0 },
//   totalAmount: { type: Number, default: 0 },
//   gstAmount: { type: Number, default: 0 },
//   cgstAmount: { type: Number, default: 0 },
//   sgstAmount: { type: Number, default: 0 },
//   igstAmount: { type: Number, default: 0 },
//   managedBy: { type: String,  },
//   batches: { type: [BatchSchema], default: [] },
//   // Quality Check Details
//   qualityCheckDetails: { type: [QualityCheckDetailSchema], default: [] },
//   warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
//   warehouseName: { type: String },
//   warehouseCode: { type: String },
//   stockAdded: { type: Boolean, default: false },
// }, { _id: false });

// const PurchaseOrderSchema = new mongoose.Schema({
//       companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
//       createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User"}, 
//   purchasequotation: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseQuotation' },
//  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
//   supplierCode: { type: String },
//   supplierName: { type: String },
//   contactPerson: { type: String },
//   refNumber: { type: String },
//   documentNumberPurchaseOrder: { type: String, required: true, },
//   // Status fields
//   orderStatus: { 
//     type: String, 
//     enum: ["Open", "Close", "Cancelled","CopiedToOrder"],
//     default: "Open" 
//   },
//   paymentStatus: { 
//     type: String, 
//     enum: ["Pending", "Partial", "Paid"],
//     default: "Pending" 
//   },
//   stockStatus: { 
//     type: String, 
//     enum: ["Not Updated", "Updated", "Adjusted"],
//     default: "Not Updated" 
//   },
//   postingDate: { type: Date },
//   validUntil: { type: Date },
//   documentDate: { type: Date },
  
//   items: [OrderItemSchema],
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
//    attachments: [
//       {
//         fileName: String,
//         fileUrl: String, // e.g., /uploads/somefile.pdf
//         fileType: String,
//         uploadedAt: { type: Date, default: Date.now },
//       },
//     ],
// }, {
//   timestamps: true,
// });

//   PurchaseOrderSchema.index({ companyId: 1, documentNumberPurchaseOrder: 1 }, { unique: true });
