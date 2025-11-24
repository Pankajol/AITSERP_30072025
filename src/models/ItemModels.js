import mongoose from "mongoose";

const QualityCheckSchema = new mongoose.Schema({
  srNo: { type: String },
  parameter: { type: String },
  min: { type: String },
  max: { type: String }
});

const ItemSchema = new mongoose.Schema(
  {
    companyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' },
    itemCode: { type: String, required: true,  },
    itemName: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number},
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
    // Quality Check
    qualityCheck: { type: Boolean, default: false },
    qualityCheckDetails: [QualityCheckSchema],
    // Tax Details – optional fields to support GST and IGST together
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
    // Optionally, a general taxRate field if needed
   
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export default mongoose.models.Item || mongoose.model("Item", ItemSchema);



// import mongoose from "mongoose";

// const QualityCheckSchema = new mongoose.Schema({
//   srNo: { type: String, required: false },
//   parameter: { type: String, required: false },
//   min: { type: String, required: false },
//   max: { type: String, required: false }
// });

// const ItemSchema = new mongoose.Schema(
//   {
//     itemCode: { type: String, required: true, unique: true },
//     itemName: { type: String, required: true },
//     description: { type: String },
//     category: { type: String, required: true },
//     unitPrice: { type: Number, required: true },
//     quantity: { type: Number, required: true },
//     reorderLevel: { type: Number },
//     itemType: { type: String },
//     uom: { type: String },
//     managedBy: { type: String, enum: ["batch", "serial"], default: "batch" },
//     managedValue:{type: String},
//     length: { type: Number },
//     width: { type: Number },
//     height: { type: Number },
//     weight: { type: Number },
//     gnr: { type: Boolean, default: false },
//     delivery: { type: Boolean, default: false },
//     productionProcess: { type: Boolean, default: false },
//     qualityCheck: { type: Boolean, default: false },
//     qualityCheckDetails: [QualityCheckSchema],
//     taxRate: { type: Number, required: false },
//     status: { type: String, enum: ["active", "inactive"], default: "active" },
//     active: { type: Boolean, default: true }
//   },
//   { timestamps: true } // Adds createdAt and updatedAt fields
// );

// export default mongoose.models.Item || mongoose.model("Item", ItemSchema);

