import mongoose from "mongoose";

const OperatorSchema = new mongoose.Schema(
  {
    operatorCode: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    cost: {
      type: Number,
      required: true,
      default: 0,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "companyUser",
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "companyUser",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Operator ||
  mongoose.model("Operator", OperatorSchema);
