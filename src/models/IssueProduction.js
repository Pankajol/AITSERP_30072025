import mongoose from 'mongoose';

const IssueProductionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
    
    productionOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductionOrder',
      required: true,
    },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    sourceWarehouse: {
      type: String,
      required: true,
    },
    destinationWarehouse: {
      type: String,
      default: '',
    },
    batchNumber: {
      type: String,
      default: '', // batchNumber optional, but required if managedByBatch is true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    expiryDate: {
      type: Date,
    },
    manufacturer: {
      type: String,
    },
    unitPrice: {
      type: Number,
      default: 0,
    },
    qtyParam: {
      type: Number,
      required: true,
      min: 0,
    },
    managedByBatch: {
      type: Boolean,
      
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.IssueProduction ||
  mongoose.model('IssueProduction', IssueProductionSchema);
