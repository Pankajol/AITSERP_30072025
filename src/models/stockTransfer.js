import mongoose from "mongoose";

const batchSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item",
    required: true,
  },
  sourceWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Warehouse",
    required: true,
  },
  destinationWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Warehouse",
    required: true,
  },
  batchNumber: {
    type: String,

  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  expiryDate: Date,
  manufacturer: String,
  unitPrice: Number,
});

const stockTransferSchema = new mongoose.Schema(
  {
    docNo: {
      type: String,
      required: true,
      unique: true,
    },
    docDate: {
      type: Date,
      required: true,
    },
    productionOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductionOrder",
      required: true,
    },
    batches: [batchSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.StockTransfer ||
  mongoose.model("StockTransfer", stockTransferSchema);
