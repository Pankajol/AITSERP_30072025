import mongoose from 'mongoose';

const StockMovementSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'companyUser' },
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Variant' }, // ✅ optional: for variant‑specific moves
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  bin: { type: mongoose.Schema.Types.ObjectId, ref: "Bin" },
  movementType: { 
    type: String,
    enum: ['IN', 'OUT', 'ON_ORDER', 'TRANSFER', 'ADJUSTMENT', 'RETURN','RESERVE','CANCEL','DEFAULT'], // ✅ added 'RESERVE' for reservation movements
    required: true
  },
  quantity: { type: Number, required: true },
  reference: { type: mongoose.Schema.Types.ObjectId, refPath: 'referenceModel' }, // dynamic reference
  referenceModel: { type: String, enum: ['PurchaseOrder', 'SalesOrder', 'GRN', 'StockAdjustment'] },
  referenceType: { type: String }, // legacy field (e.g., "PurchaseOrder")
  remarks: { type: String },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

// Indexes for quick lookups
StockMovementSchema.index({ companyId: 1, item: 1 });
StockMovementSchema.index({ companyId: 1, warehouse: 1 });
StockMovementSchema.index({ companyId: 1, reference: 1 });
StockMovementSchema.index({ companyId: 1, variantId: 1 });

export default mongoose.models.StockMovement || mongoose.model('StockMovement', StockMovementSchema);



// import mongoose from 'mongoose';

// const StockMovementSchema = new mongoose.Schema({
//   companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
//   createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'companyUser' },
//   item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
//  // optional
//   warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
//   bin: { type: mongoose.Schema.Types.ObjectId, ref: "Bin" },
//   movementType: { 
//     type: String, 
  
//   },
//   quantity: { type: Number, required: true },
//   reference: { type: String }, // e.g. invoice number, GRN, etc.
//   remarks: { type: String },
//   date: { type: Date, default: Date.now },
// }, {
//   timestamps: true,
// });

// export default mongoose.models.StockMovement || mongoose.model('StockMovement', StockMovementSchema);



// import mongoose from 'mongoose';

// const StockMovementSchema = new mongoose.Schema({
//   item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
//   warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
//   movementType: { type: String, enum: ['IN', 'OUT', 'TRANSFER'], required: true },
//   quantity: { type: Number, required: true },
//   reference: { type: String }, // e.g. invoice number, GRN, etc.
//   remarks: { type: String },
//   date: { type: Date, default: Date.now },
// }, {
//   timestamps: true,
// });

// export default mongoose.models.StockMovement || mongoose.model('StockMovement', StockMovementSchema);

