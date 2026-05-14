import mongoose from "mongoose";

const BinSchema = new mongoose.Schema(
  {
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    code: { type: String, required: true },       // Bin code
    aisle: { type: String, required: true },      // Aisle number
    rack: { type: String, required: true },       // Rack number
    bin: { type: String, required: true },        // Bin position
    maxCapacity: { type: Number, required: true } // Maximum capacity
  },
  { timestamps: true }
);

export default mongoose.models.Bin || mongoose.model("Bin", BinSchema);
