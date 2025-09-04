import mongoose from 'mongoose';

const StockMovementSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'companyUser' },
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  movementType: { 
    type: String, 
    enum: ['IN', 'OUT', 'TRANSFER', 'RESERVE', 'FULFILL','ON_ORDER','RETURN','ADJUSTMENT',' STOCK ISSUE','RECEIPT FROM PRODUCTION ORDER'], 
    required: true 
  },
  quantity: { type: Number, required: true },
  reference: { type: String }, // e.g. invoice number, GRN, etc.
  remarks: { type: String },
  date: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

export default mongoose.models.StockMovement || mongoose.model('StockMovement', StockMovementSchema);



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

