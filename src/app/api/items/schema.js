const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemCode: {
    type: String,
    required: true,
    unique: true,
  },
  itemName: {
    type: String,
    required: true,
  },
  itemGroup: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  unitOfMeasurement: {
    type: String,
    default: '',
  },
  barcode: {
    type: String,
    default: '',
  },
  valuationMethod: {
    type: String,
    enum: ['FIFO', 'LIFO', 'STANDARD'],
    default: 'FIFO',
  },
  maintainStock: {
    type: Boolean,
    default: false,
  },
  sellingPrice: {
    type: Number,
    default: 0,
  },
  purchasePrice: {
    type: Number,
    default: 0,
  },
  minimumOrderQty: {
    type: Number,
    default: 0,
  },
  shelfLife: {
    type: Number,
    default: 0, // in days
  },
  warrantyPeriod: {
    type: Number,
    default: 0, // in days
  },
  leadTime: {
    type: Number,
    default: 0, // in days
  },
  qualityInspection: {
    type: String,
    default: '',
  },
  materialRequestType: {
    type: String,
    default: '',
  },
}, { timestamps: true });

module.exports = mongoose.models.Item || mongoose.model('Item', itemSchema);
