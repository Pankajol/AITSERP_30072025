import mongoose from "mongoose";

const EmployeeSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  

  employeeCode: { type: String, required: true, unique: true },

  fullName: { type: String, required: true },
  email: { type: String, unique: true },
  phone: String,
  gender: { type: String, enum: ["Male","Female","Other"] },
  dob: Date,

  department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
  designation: { type: mongoose.Schema.Types.ObjectId, ref: "Designation" },

  joiningDate: { type: Date, required: true },
  
  employmentType: {
    type: String,
    enum: ["Full-Time","Part-Time","Intern","Contract"],
    default: "Full-Time"
  },

  salary: {
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
  },

  bank: {
    accountNumber: String,
    ifsc: String,
    bankName: String,
  },

  address: String,

  status: {
    type: String,
    enum: ["Active","Inactive","Resigned","Terminated"],
    default: "Active"
  }

}, { timestamps: true });

export default mongoose.models.Employee || mongoose.model("Employee", EmployeeSchema);
