import mongoose from 'mongoose';
import Counter from "@/models/Counter";
const { Schema } = mongoose;


// If you don't need batch management, you can remove BatchSchema entirely.
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
  orderedQuantity: { type: Number, required: true },
  receivedQuantity: { type: Number, default: 0 },
  itemDescription: { type: String },

  // We'll use "quantity" as the final quantity used in GRN calculations.
  quantity: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  freight: { type: Number, default: 0 },
  // Replace gstType with gstRate and taxOption
  gstRate: { type: Number, default: 0 },
  taxOption: { type: String, enum: ['GST', 'IGST'], default: 'GST' },
  priceAfterDiscount: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  gstAmount: { type: Number, default: 0 },
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  managedBy: { type: String,  },
  batches: { type: [BatchSchema], default: [] },
  // Quality Check Details
  qualityCheckDetails: { type: [QualityCheckDetailSchema], default: [] },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  warehouseName: { type: String },
  warehouseCode: { type: String },
  stockAdded: { type: Boolean, default: false },
}, { _id: false });

const PurchaseOrderSchema = new mongoose.Schema({
      companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User"}, 
  purchasequotation: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseQuotation' },
 supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierCode: { type: String },
  supplierName: { type: String },
  contactPerson: { type: String },
  refNumber: { type: String },
  documentNumberPurchaseOrder: { type: String, required: true, },
  // Status fields
  orderStatus: { 
    type: String, 
    enum: ["Open", "Close", "Cancelled","CopiedToOrder"],
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
  postingDate: { type: Date },
  validUntil: { type: Date },
  documentDate: { type: Date },
  
  items: [OrderItemSchema],
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
   attachments: [
      {
        fileName: String,
        fileUrl: String, // e.g., /uploads/somefile.pdf
        fileType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
}, {
  timestamps: true,
});

  PurchaseOrderSchema.index({ companyId: 1, documentNumberPurchaseOrder: 1 }, { unique: true });

// PurchaseOrderSchema.pre("save", async function (next) {
//   if (this.documentNumberPurchaseOrder) return next();
//   try {
//     const key = `PurchaseOrder_${this.companyId}`;
//    const counter = await Counter.findOneAndUpdate(
//   { id: key, companyId: this.companyId }, // Match on both
//   { 
//     $inc: { seq: 1 },
//     $setOnInsert: {seq: 1, companyId: this.companyId }  // Ensure it's set on insert
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
// this.documentNumberPurchaseOrder = `PURCH-ORD/${financialYear}/${paddedSeq}`;


//     // this.salesNumber = `Sale-${String(counter.seq).padStart(3, '0')}`;
//     next();
//   } catch (err) {
//     next(err);
//   }
// });




export default mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', PurchaseOrderSchema);


// import mongoose from 'mongoose';

// const OrderItemSchema = new mongoose.Schema({
//   item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
//   itemCode: { type: String },
//   itemName: { type: String },
//   orderedQuantity: { type: Number, required: true },
//   receivedQuantity: { type: Number, default: 0 },
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
//   warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
//   warehouseName: { type: String },
//   warehouseCode: { type: String },
//   stockAdded: { type: Boolean, default: false },
// }, { _id: false });

// const PurchaseOrderSchema = new mongoose.Schema({
//   supplierCode: { type: String },
//   supplierName: { type: String },
//   contactPerson: { type: String },
//   refNumber: { type: String },
//   // Status fields
//   orderStatus: { 
//     type: String, 
//     enum: ["Open", "Close", "Cancelled"], 
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
// }, {
//   timestamps: true,
// });

// export default mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', PurchaseOrderSchema);



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

// const PurchaseOrderSchema = new mongoose.Schema({
//   supplierCode: { type: String },
//   supplierName: { type: String },
//   contactPerson: { type: String },
//   refNumber: { type: String },
//   status: { type: String, default: "Open" },
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

// export default mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', PurchaseOrderSchema);
