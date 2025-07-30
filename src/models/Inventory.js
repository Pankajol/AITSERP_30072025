import mongoose from 'mongoose';

// Define a schema for batch details.
const InventoryBatchSchema = new mongoose.Schema({
  batchNumber: { type: String, required: true },
  expiryDate: { type: Date },
  manufacturer: { type: String },
  quantity: { type: Number, default: 0 }, // Quantity for this batch
  unitPrice: { type: Number, default: 0 },
}, { _id: false });

const InventorySchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  // For non-batch managed items.
  quantity: { type: Number, default: 0 }, // Total physical stock
  committed: { type: Number, default: 0 }, // Reserved for sales orders
  onOrder: { type: Number, default: 0 },   // Pending purchase orders (if applicable)
  unitPrice: { type: Number, default: 0 },
  // For batch-managed items, store batch details.
  batches: { type: [InventoryBatchSchema], default: [] },
  productNo: { type: mongoose.Schema.Types.ObjectId, ref: 'BOM' },
  productDesc: { type: String },

}, {
  timestamps: true,
});

export default mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);







// import mongoose from 'mongoose';

// const InventorySchema = new mongoose.Schema({
//   warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
//   item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
//   quantity: { type: Number, default: 0 }, // Physical stock
//   committed: { type: Number, default: 0 }, // Reserved for sales orders
//   onOrder: { type: Number, default: 0 },   // Pending purchase orders (if applicable)
//   unitPrice: { type: Number, default: 0 },
// }, {
//   timestamps: true,
// });

// export default mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);

