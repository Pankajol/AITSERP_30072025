import mongoose from "mongoose";
import Counter from "@/models/Counter";
const { Schema } = mongoose; // Assuming you have a Counter model for auto-incrementing IDs

// Address schema for billing and shipping addresses
const addressSchema = new mongoose.Schema({
  address1: { type: String, trim: true },
  address2: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  zip: {
    type: String,
    trim: true,
    match: [/^[0-9]{6}$/, "Invalid zip code format"]
  },
  country: { type: String, trim: true }
}, { _id: false });

const ItemSchema = new mongoose.Schema({
      item: { type: mongoose.Schema.Types.ObjectId, ref: "Item" , required: false, },
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
  
   
      removalReason: { type: String },
});

const SalesOrderSchema = new mongoose.Schema(

  {
     /* ⬇⬇ MULTITENANT FIELDS */
    companyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' },
    quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesQuotation' },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerCode: { type: String, required: true },
    customerName: { type: String, required: true },
    contactPerson: { type: String },
    salesNumber: { type: String, },
    refNumber: { type: String },
    status: { type: String, default: "Open" },
    documentNumberOrder: { type: String, required: true},
 // Default status stage
    postingDate: { type: Date },
    orderDate: { type: Date },
    expectedDeliveryDate: { type: Date },
    fromQuote: { type: Boolean, default: false },
    validUntil: { type: Date },
    documentDate: { type: Date },
    // Address fieldss
    billingAddress: {
      type: addressSchema,
      required: false
    },
    shippingAddress: {
      type: addressSchema,
      required: false
    },
    items: [ItemSchema],
    salesEmployee: { type: String },
    remarks: { type: String },
    freight: { type: Number, default: 0 },
    rounding: { type: Number, default: 0 },
    totalBeforeDiscount: { type: Number, default: 0 },
    totalDownPayment: { type: Number, default: 0 },
    appliedAmounts: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    openBalance: { type: Number, default: 0 },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesQuotation' },
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

SalesOrderSchema.index({ documentNumberOrder: 1, companyId: 1 }, { unique: true });


/* per‑tenant auto‑increment */
// SalesOrderSchema.pre("save", async function (next) {
//   if (this.documentNumberOrder) return next();
//   try {
//     const key = `salesOrder${this.companyId}`;
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
// this.documentNumberOrder = `Sal-ORD/${financialYear}/${paddedSeq}`;


//     // this.salesNumber = `Sale-${String(counter.seq).padStart(3, '0')}`;
//     next();
//   } catch (err) {
//     next(err);
//   }
// });




export default mongoose.models.SalesOrder ||
  mongoose.model("SalesOrder", SalesOrderSchema);














// import mongoose from "mongoose";

// // Schema for each sales order item (without batch information)
// const ItemSchema = new mongoose.Schema({
//   item: { type: String, required: true },
//   itemCode: { type: String, required: true },
//   itemName: { type: String, required: true },
//   itemDescription: { type: String, required: true },
//   quantity: { type: Number, required: true }, // Total quantity for the item
//   allowedQuantity: { type: Number, default: 0 },
//   receivedQuantity: { type: Number, default: 0 },
//   unitPrice: { type: Number, required: true },
//   discount: { type: Number, default: 0 },
//   freight: { type: Number, default: 0 },
//   gstType: { type: Number, default: 0 },
//   gstRate: { type: Number, default: 0 },
//   taxOption: { type: String, enum: ["GST", "IGST"], default: "GST" },
//   priceAfterDiscount: { type: Number, required: true },
//   totalAmount: { type: Number, required: true },
//   gstAmount: { type: Number, required: true },
//   cgstAmount: { type: Number, default: 0 },
//   sgstAmount: { type: Number, default: 0 },
//   igstAmount: { type: Number, default: 0 },
//   managedBy: { type: String,},
//   warehouse: { type: String, required: true },
//   warehouseName: { type: String, required: true },
//   warehouseCode: { type: String, required: true },
  
//   errorMessage: { type: String },
// });

// // Schema for the overall Sales Order document
// const SalesOrderSchema = new mongoose.Schema({
//   customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
//   customerCode: { type: String, required: true },
//   customerName: { type: String, required: true },
//   contactPerson: { type: String },
//   refNumber: { type: String,  }, // Sales Order Number
//   salesEmployee: { type: String },
//   status: { type: String, default: "Open" },
//   orderDate: { type: Date },
//   expectedDeliveryDate: { type: Date },
//   items: [ItemSchema],
//   remarks: { type: String },
//   freight: { type: Number, default: 0 },
//   rounding: { type: Number, default: 0 },
//   totalDownPayment: { type: Number, default: 0 },
//   appliedAmounts: { type: Number, default: 0 },
//   totalBeforeDiscount: { type: Number, required: true },
//   gstTotal: { type: Number, required: true },
//   grandTotal: { type: Number, required: true },
//   openBalance: { type: Number, required: true },
//   fromQuote: { type: Boolean, default: false },
//   createdAt: { type: Date, default: Date.now },
// });

// export default mongoose.models.SalesOrder || mongoose.model("SalesOrder", SalesOrderSchema);


// import mongoose from 'mongoose';

// const SalesOrderItemSchema = new mongoose.Schema({
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
//   warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
//   warehouseName: { type: String },
//   warehouseCode: { type: String },
// }, { _id: false });

// const SalesOrderSchema = new mongoose.Schema({
//   customerCode: { type: String },
//   customerName: { type: String },
//   contactPerson: { type: String },
//   refNumber: { type: String },
//   status: { type: String, default: "Open" },
//   postingDate: { type: Date },
//   validUntil: { type: Date },
//   documentDate: { type: Date },
//   items: [SalesOrderItemSchema],
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

// export default mongoose.models.SalesOrder || mongoose.model('SalesOrder', SalesOrderSchema);
