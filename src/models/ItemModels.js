import mongoose from "mongoose";

const QualityCheckSchema = new mongoose.Schema({
  srNo: { type: String },
  parameter: { type: String },
  min: { type: String },
  max: { type: String }
});

const POSConfigSchema = new mongoose.Schema({
  barcode: { type: String, trim: true },
  posPrice: { type: Number },
  allowDiscount: { type: Boolean, default: true },
  maxDiscountPercent: { type: Number, default: 100 },
  taxableInPOS: { type: Boolean, default: true },
  showInPOS: { type: Boolean, default: true },
}, { _id: false });

// ✅ Variant Schema
const VariantSchema = new mongoose.Schema({
  sku: { type: String, trim: true },
  attributes: {
    type: Map,
    of: String,
    default: {},
  },
  price: { type: Number },        // override base price
  quantity: { type: Number, default: 0 },
  imageUrl: { type: String },
  barcode: { type: String, trim: true },
  posPrice: { type: Number },     // variant specific POS price
}, { _id: true, timestamps: false });

const ItemSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
    imageUrl: { type: String },
    itemCode: { type: String, required: true },
    itemName: { type: String, required: true },
    description: { type: String },

    category: { type: String, required: true },
    unitPrice: { type: Number, required: true },

    quantity: { type: Number, default: 0 },
    reorderLevel: { type: Number },
    leadTime: { type: Number },

    itemType: { type: String },
    uom: { type: String },

    managedBy: { type: String },
    managedValue: { type: String },

    batchNumber: { type: String },
    expiryDate: { type: Date },
    manufacturer: { type: String },

    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
    weight: { type: Number },

    gnr: { type: Boolean, default: false },
    delivery: { type: Boolean, default: false },
    productionProcess: { type: Boolean, default: false },

    posEnabled: { type: Boolean, default: false },
    posConfig: { type: POSConfigSchema, default: {} },

    includeQualityCheck: { type: Boolean, default: false },
    qualityCheckDetails: [QualityCheckSchema],

    includeGST: { type: Boolean, default: true },
    includeIGST: { type: Boolean, default: false },
    gstCode: { type: String },
    gstName: { type: String },
    gstRate: { type: Number },
    cgstRate: { type: Number },
    sgstRate: { type: Number },
    igstCode: { type: String },
    igstName: { type: String },
    igstRate: { type: Number },

    // ✅ Variants array
    variants: [VariantSchema],

    status: { type: String, enum: ["active", "inactive"], default: "active" },
    active: { type: Boolean, default: true },

    // 🆕 Marketplace fields
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", default: null },
    commissionPercent: { type: Number, default: 0 },
    isMarketplace: { type: Boolean, default: false },
    bookingSlots: [{
      date: Date,
      startTime: String,
      endTime: String,
      maxBookings: Number,
      currentBookings: { type: Number, default: 0 },
    }],
  },
  { timestamps: true }
);

ItemSchema.index({ companyId: 1, posEnabled: 1, active: 1 });
ItemSchema.index({ companyId: 1, "posConfig.barcode": 1 });

export default mongoose.models.Item || mongoose.model("Item", ItemSchema);



// import mongoose from "mongoose";

// const QualityCheckSchema = new mongoose.Schema({
//   srNo: { type: String },
//   parameter: { type: String },
//   min: { type: String },
//   max: { type: String }
// });

// const POSConfigSchema = new mongoose.Schema({
//   barcode: { type: String, trim: true },
//   posPrice: { type: Number },
//   allowDiscount: { type: Boolean, default: true },
//   maxDiscountPercent: { type: Number, default: 100 },
//   taxableInPOS: { type: Boolean, default: true },
//   showInPOS: { type: Boolean, default: true },
// }, { _id: false });

// // ✅ Variant Schema
// const VariantSchema = new mongoose.Schema({
//   sku: { type: String, trim: true },
//   attributes: {
//     type: Map,
//     of: String,
//     default: {},
//   },
//   price: { type: Number },        // override base price
//   quantity: { type: Number, default: 0 },
//   imageUrl: { type: String },
//   barcode: { type: String, trim: true },
//   posPrice: { type: Number },     // variant specific POS price
// }, { _id: true, timestamps: false });

// const ItemSchema = new mongoose.Schema(
//   {
//     companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
//     imageUrl: { type: String },
//     itemCode: { type: String, required: true },
//     itemName: { type: String, required: true },
//     description: { type: String },

//     category: { type: String, required: true },
//     unitPrice: { type: Number, required: true },

//     quantity: { type: Number, default: 0 },
//     reorderLevel: { type: Number },
//     leadTime: { type: Number },

//     itemType: { type: String },
//     uom: { type: String },

//     managedBy: { type: String },
//     managedValue: { type: String },

//     batchNumber: { type: String },
//     expiryDate: { type: Date },
//     manufacturer: { type: String },

//     length: { type: Number },
//     width: { type: Number },
//     height: { type: Number },
//     weight: { type: Number },

//     gnr: { type: Boolean, default: false },
//     delivery: { type: Boolean, default: false },
//     productionProcess: { type: Boolean, default: false },

//     posEnabled: { type: Boolean, default: false },
//     posConfig: { type: POSConfigSchema, default: {} },

//     includeQualityCheck: { type: Boolean, default: false },
//     qualityCheckDetails: [QualityCheckSchema],

//     includeGST: { type: Boolean, default: true },
//     includeIGST: { type: Boolean, default: false },
//     gstCode: { type: String },
//     gstName: { type: String },
//     gstRate: { type: Number },
//     cgstRate: { type: Number },
//     sgstRate: { type: Number },
//     igstCode: { type: String },
//     igstName: { type: String },
//     igstRate: { type: Number },

//     // ✅ Variants array
//     variants: [VariantSchema],

//     status: { type: String, enum: ["active", "inactive"], default: "active" },
//     active: { type: Boolean, default: true }
//   },
//   { timestamps: true }
// );

// ItemSchema.index({ companyId: 1, posEnabled: 1, active: 1 });
// ItemSchema.index({ companyId: 1, "posConfig.barcode": 1 });

// export default mongoose.models.Item || mongoose.model("Item", ItemSchema);


