// 📁 src/models/hr/Salary.js

import mongoose from "mongoose";

const SalarySchema = new mongoose.Schema({
  companyId:        { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  employeeId:       { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },

  month:            { type: Number, required: true }, // 1–12
  year:             { type: Number, required: true },
  date:             { type: Date },

  // Earnings
  basicSalary:      { type: Number, default: 0 },
  hra:              { type: Number, default: 0 },
  da:               { type: Number, default: 0 },
  specialAllowance: { type: Number, default: 0 },
  bonus:            { type: Number, default: 0 },
  overtime:         { type: Number, default: 0 },
  grossPay:         { type: Number, default: 0 },

  // Deductions
  pfEmployee:       { type: Number, default: 0 },
  pfEmployer:       { type: Number, default: 0 },
  esi:              { type: Number, default: 0 },
  tds:              { type: Number, default: 0 },
  otherDeductions:  { type: Number, default: 0 },
  totalDeductions:  { type: Number, default: 0 },

  // Attendance
  totalDays:        { type: Number },
  presentDays:      { type: Number },
  lopDays:          { type: Number, default: 0 },

  netPay:           { type: Number, default: 0 },
  status:           { type: String, enum: ["Paid", "Pending", "Hold"], default: "Pending" },
  paidAt:           { type: Date },
  remarks:          { type: String },

}, { timestamps: true });

SalarySchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.models.Salary || mongoose.model("Salary", SalarySchema);