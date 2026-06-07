import mongoose from "mongoose";

const StaffDeploymentSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, index: true },   // ✅ हमेशा String
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
  { timestamps: true, collection: 'staffdeployments' }
);

StaffDeploymentSchema.index(
  { companyId: 1, employeeId: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

export default mongoose.models.StaffDeployment || mongoose.model("StaffDeployment", StaffDeploymentSchema);