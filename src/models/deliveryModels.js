import mongoose from "mongoose";
import Counter from "@/models/Counter";
const { Schema } = mongoose;

// Batch schema
const BatchSchema = new Schema({
  batchCode: { type: String, required: true },
  expiryDate: { type: Date },
  manufacturer: { type: String },
  allocatedQuantity: { type: Number, required: true },
  availableQuantity: { type: Number, default: 0 },
}, { _id: false });

// Item schema
const ItemSchema = new Schema({
  item: { type: Schema.Types.ObjectId, ref: "Item", required: true },
  itemCode: String,
  itemName: String,
  itemDescription: String,
  quantity: { type: Number, required: true },
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
  warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse", required: true },
  warehouseName: String,
  warehouseCode: String,
  stockAdded: { type: Boolean, default: false },
  managedByBatch: { type: Boolean, default: true },
  batches: [BatchSchema],
  removalReason: String,
}, { _id: false });

// Delivery schema
const DeliverySchema = new Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  branchId: { type: Schema.Types.ObjectId, ref: "Branch" },

  deliveryType: { type: String, enum: ["Sales", "Purchase"], required: true },
  deliveryDate: { type: Date, required: true },
  deliveryNumber: { type: String },
  documentNumberDelivery: { type: String, unique: true },

  salesOrderId: { type: Schema.Types.ObjectId, ref: "SalesOrder" },
  customer: { type: Schema.Types.ObjectId, ref: "Customer" },
  customerCode: { type: String },
  customerName: { type: String },
  contactPerson: String,
  refNumber: String,
  salesEmployee: String,

  status: { type: String, enum: ["Pending", "Confirmed", "Partially Delivered", "Delivered", "Close", "Draft"], default: "Pending" },

  orderDate: Date,
  expectedDeliveryDate: Date,

  items: { type: [ItemSchema], required: true },

  remarks: String,
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
  sourceModel: { type: String, enum: ["SalesOrder", "delivery"], default: "SalesOrder" },

  attachments: [{
    fileName: { type: String,  },
    fileUrl: { type: String,  },
    fileType: { type: String,  },
    uploadedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });
DeliverySchema.pre("save", async function (next) {
  if (this.documentNumberDelivery) return next();
  try {
    const key = `delivery${this.companyId}`;
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
this.documentNumberDelivery = `SALE-DELI/${financialYear}/${paddedSeq}`;


    // this.salesNumber = `Sale-${String(counter.seq).padStart(3, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

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