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
    linkedPurchaseOrder: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder'},
    linkedProductionOrder: { type: Schema.Types.ObjectId, ref: 'ProductionOrder'},
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




export default mongoose.models.SalesOrder ||
  mongoose.model("SalesOrder", SalesOrderSchema);










