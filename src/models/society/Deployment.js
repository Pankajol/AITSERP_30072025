import mongoose from "mongoose";

const DeploymentSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },  // ✅ changed to String
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
    societyId:  { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: "Shift" },
    customShiftStart: String,
    customShiftEnd: String,
    startDate: { type: Date, required: true },
    endDate: Date,
    isActive: { type: Boolean, default: true },
    dailyRate: Number,
    billingCycle: { type: String, enum: ["Daily", "Weekly", "Monthly"], default: "Monthly" },
  },
  { timestamps: true, collection: 'deployments' }
);

DeploymentSchema.index(
  { companyId: 1, employeeId: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

export default mongoose.models.Deployment || mongoose.model("Deployment", DeploymentSchema);