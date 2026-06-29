import mongoose from "mongoose";

const OperatorSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    operatorCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    skill: {
      type: String,
      enum: ["machine", "assembly", "welding", "fabrication", "other"],
      default: "other",
    },
    costPerHour: {
      type: Number,
      default: 0,
      min: 0,
    },
    costPerDay: {
      type: Number,
      default: 0,
      min: 0,
    },
    efficiency: {
      type: Number,
      default: 100,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "on-leave"],
      default: "active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyUser",
    },
  },
  { timestamps: true }
);

// No pre-save hook – operatorCode must be entered manually

export default mongoose.models.Operator || mongoose.model("Operator", OperatorSchema);