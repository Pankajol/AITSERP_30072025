import mongoose from "mongoose";

const ProductionOrderSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    itemCode: { type: String, required: true, trim: true },
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
    },
    assignedMachine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Machine",
      default: null,
    },
    assignedOperator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Operator",
      default: null,
    },
    assignedResource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resource",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyUser",
    },
  },
  { timestamps: true }
);

export default mongoose.models.ProductionOrder ||
  mongoose.model("ProductionOrder", ProductionOrderSchema);