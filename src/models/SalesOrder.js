import mongoose from "mongoose";
import Counter from "@/models/Counter";

const { Schema } = mongoose;

// Address sub‑schema
const addressSchema = new Schema({
  address1: { type: String, trim: true },
  address2: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  zip: { type: String, trim: true, match: [/^[0-9]{6}$/, "Invalid zip code"] },
  country: { type: String, trim: true }
}, { _id: false });

// Item sub‑schema – includes variant fields
const ItemSchema = new Schema({
  item: { type: Schema.Types.ObjectId, ref: "Item" },
  imageUrl: { type: String, default: "" },
  itemCode: { type: String },
  itemName: { type: String },
  itemDescription: { type: String },
  quantity: { type: Number, default: 0 },
  deliveredQuantity: { type: Number, default: 0 },
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
  warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse" },
  warehouseName: { type: String },
  warehouseCode: { type: String },
  stockAdded: { type: Boolean, default: false },
  managedBy: { type: String, default: "" },
  removalReason: { type: String, default: "" },
  // ✅ Variant support
  variant: {
    variantId: { type: Schema.Types.ObjectId, ref: "Variant" },
    sku: { type: String },
    attributes: { type: Object, default: {} },
    variantPrice: { type: Number },
    variantImageUrl: { type: String },
    variantBarcode: { type: String }
  },
  selectedVariantId: { type: String, default: null },

  // 🆕 Marketplace fields
  vendorId: { type: Schema.Types.ObjectId, ref: "Vendor", default: null },
  commissionPercent: { type: Number, default: 0 },
  commissionAmount: { type: Number, default: 0 },
  settlementStatus: { type: String, enum: ["pending", "settled"], default: "pending" },
  selectedDate: Date,
}, { _id: false });

const SalesOrderSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "CompanyUser" },
    quotation: { type: Schema.Types.ObjectId, ref: "SalesQuotation" },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    customerCode: { type: String, required: true },
    customerName: { type: String, required: true },
    contactPerson: { type: String, default: "" },
    salesNumber: { type: String },
    refNumber: { type: String, default: "" },
    status: { type: String, default: "Open" },
    documentNumberOrder: { type: String, required: true, unique: true },
    postingDate: { type: Date },
    orderDate: { type: Date },
    expectedDeliveryDate: { type: Date },
    fromQuote: { type: Boolean, default: false },
    validUntil: { type: Date },
    documentDate: { type: Date },
    billingAddress: { type: addressSchema },
    shippingAddress: { type: addressSchema },
    items: [ItemSchema],
    salesEmployee: { type: String, default: "" },
    remarks: { type: String, default: "" },
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
    orderId: { type: Schema.Types.ObjectId, ref: "SalesQuotation" },
    linkedPurchaseOrder: { type: Schema.Types.ObjectId, ref: "PurchaseOrder" },
    linkedProductionOrder: { type: Schema.Types.ObjectId, ref: "ProductionOrder" },
    attachments: [{
      fileName: String,
      fileUrl: String,
      fileType: String,
      uploadedAt: { type: Date, default: Date.now },
      publicId: String
    }],

    // 🆕 Marketplace order type
    orderType: { type: String, enum: ["regular", "marketplace"], default: "regular" },
  },
  { timestamps: true }
);

SalesOrderSchema.index({ documentNumberOrder: 1, companyId: 1 }, { unique: true });

export default mongoose.models.SalesOrder || mongoose.model("SalesOrder", SalesOrderSchema);



// import mongoose from "mongoose";
// import Counter from "@/models/Counter";

// const { Schema } = mongoose;

// // Address sub‑schema
// const addressSchema = new Schema({
//   address1: { type: String, trim: true },
//   address2: { type: String, trim: true },
//   city: { type: String, trim: true },
//   state: { type: String, trim: true },
//   zip: { type: String, trim: true, match: [/^[0-9]{6}$/, "Invalid zip code"] },
//   country: { type: String, trim: true }
// }, { _id: false });

// // Item sub‑schema – includes variant fields
// const ItemSchema = new Schema({
//   item: { type: Schema.Types.ObjectId, ref: "Item" },
//   imageUrl: { type: String, default: "" },
//   itemCode: { type: String },
//   itemName: { type: String },
//   itemDescription: { type: String },
//   quantity: { type: Number, default: 0 },
//   deliveredQuantity: { type: Number, default: 0 },
//   orderedQuantity: { type: Number, default: 0 },
//   unitPrice: { type: Number, default: 0 },
//   discount: { type: Number, default: 0 },
//   freight: { type: Number, default: 0 },
//   gstRate: { type: Number, default: 0 },
//   igstRate: { type: Number, default: 0 },
//   taxOption: { type: String, enum: ["GST", "IGST"], default: "GST" },
//   priceAfterDiscount: { type: Number, default: 0 },
//   totalAmount: { type: Number, default: 0 },
//   gstAmount: { type: Number, default: 0 },
//   cgstAmount: { type: Number, default: 0 },
//   sgstAmount: { type: Number, default: 0 },
//   igstAmount: { type: Number, default: 0 },
//   tdsAmount: { type: Number, default: 0 },
//   warehouse: { type: Schema.Types.ObjectId, ref: "Warehouse" },
//   warehouseName: { type: String },
//   warehouseCode: { type: String },
//   stockAdded: { type: Boolean, default: false },
//   managedBy: { type: String, default: "" },
//   removalReason: { type: String, default: "" },
//   // ✅ Variant support
//   variant: {
//     variantId: { type: Schema.Types.ObjectId, ref: "Variant" },
//     sku: { type: String },
//     attributes: { type: Object, default: {} },
//     variantPrice: { type: Number },
//     variantImageUrl: { type: String },
//     variantBarcode: { type: String }
//   },
//   selectedVariantId: { type: String, default: null }
// }, { _id: false });

// const SalesOrderSchema = new Schema(
//   {
//     companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
//     createdBy: { type: Schema.Types.ObjectId, ref: "CompanyUser" },
//     quotation: { type: Schema.Types.ObjectId, ref: "SalesQuotation" },
//     customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
//     customerCode: { type: String, required: true },
//     customerName: { type: String, required: true },
//     contactPerson: { type: String, default: "" },
//     salesNumber: { type: String },
//     refNumber: { type: String, default: "" },
//     status: { type: String, default: "Open" },
//     documentNumberOrder: { type: String, required: true, unique: true },
//     postingDate: { type: Date },
//     orderDate: { type: Date },
//     expectedDeliveryDate: { type: Date },
//     fromQuote: { type: Boolean, default: false },
//     validUntil: { type: Date },
//     documentDate: { type: Date },
//     billingAddress: { type: addressSchema },
//     shippingAddress: { type: addressSchema },
//     items: [ItemSchema],
//     salesEmployee: { type: String, default: "" },
//     remarks: { type: String, default: "" },
//     freight: { type: Number, default: 0 },
//     rounding: { type: Number, default: 0 },
//     totalBeforeDiscount: { type: Number, default: 0 },
//     totalDownPayment: { type: Number, default: 0 },
//     appliedAmounts: { type: Number, default: 0 },
//     gstAmount: { type: Number, default: 0 },
//     cgstAmount: { type: Number, default: 0 },
//     sgstAmount: { type: Number, default: 0 },
//     igstAmount: { type: Number, default: 0 },
//     grandTotal: { type: Number, default: 0 },
//     openBalance: { type: Number, default: 0 },
//     orderId: { type: Schema.Types.ObjectId, ref: "SalesQuotation" },
//     linkedPurchaseOrder: { type: Schema.Types.ObjectId, ref: "PurchaseOrder" },
//     linkedProductionOrder: { type: Schema.Types.ObjectId, ref: "ProductionOrder" },
//     attachments: [{
//       fileName: String,
//       fileUrl: String,
//       fileType: String,
//       uploadedAt: { type: Date, default: Date.now },
//       publicId: String
//     }]
//   },
//   { timestamps: true }
// );

// SalesOrderSchema.index({ documentNumberOrder: 1, companyId: 1 }, { unique: true });

// export default mongoose.models.SalesOrder || mongoose.model("SalesOrder", SalesOrderSchema);

