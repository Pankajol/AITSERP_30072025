import mongoose from "mongoose";

const operationSchema = new mongoose.Schema(
  {
    code: { type: String, required: [true, "Please provide an operation code"] },
    name: { type: String, required: true },
    cost: { type: Number, required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "companyUser" },
  },
  { timestamps: true }
);

export default mongoose.models.Operation|| mongoose.model("Operation", operationSchema);