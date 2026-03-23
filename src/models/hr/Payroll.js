// 📁 src/models/hr/Payroll.js

import mongoose from "mongoose";

const PayrollSchema = new mongoose.Schema({
  companyId:   { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  employeeId:  { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },

  month:       { type: String, required: true }, // "YYYY-MM" e.g. "2026-03"

  basic:       { type: Number, default: 0 },
  hra:         { type: Number, default: 0 },
  allowances:  { type: Number, default: 0 },
  deductions:  { type: Number, default: 0 },
  netSalary:   { type: Number, default: 0 },

  paidStatus:  { type: String, enum: ["Unpaid", "Processing", "Paid"], default: "Unpaid" },
  paidAt:      { type: Date },

}, { timestamps: true });

// ✅ One payroll per employee per month
PayrollSchema.index({ employeeId: 1, month: 1 }, { unique: true });

export default mongoose.models.Payroll || mongoose.model("Payroll", PayrollSchema);