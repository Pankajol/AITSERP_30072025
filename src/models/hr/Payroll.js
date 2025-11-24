import mongoose from "mongoose";

const PayrollSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },

  month: { type: String, required: true }, // 2025-01

  basic: Number,
  hra: Number,
  allowances: Number,
  deductions: Number,

  netSalary: Number,

  paidStatus: {
    type: String,
    enum: ["Paid","Unpaid","Processing"],
    default: "Unpaid"
  },

  paidDate: Date

}, { timestamps: true });

PayrollSchema.index({ employeeId: 1, month: 1 }, { unique: true });

export default mongoose.models.Payroll || mongoose.model("Payroll", PayrollSchema);
