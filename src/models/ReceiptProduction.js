import mongoose from 'mongoose';
const { Schema } = mongoose;

const BatchSchema = new mongoose.Schema({
  batchNumber: String,
  quantity: Number,
  expiryDate: Date,
  manufacturer: String,
  unitPrice: Number,
}, { _id: false });

const ReceiptProductionSchema = new mongoose.Schema({
  companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  productionOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionOrder', required: true },
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  sourceWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  docNo: String,
  docDate: String,
  quantity: Number,
  unitPrice: Number,
  totalPrice: Number,
  batches: [BatchSchema],
}, {
  timestamps: true,
});

export default mongoose.models.ReceiptProduction || mongoose.model('ReceiptProduction', ReceiptProductionSchema);
