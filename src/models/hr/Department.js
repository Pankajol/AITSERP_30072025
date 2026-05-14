import mongoose from "mongoose";

const DepartmentSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },

  name: { type: String, required: true, unique: true },
  description: String,
  head: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },

}, { timestamps: true });

export default mongoose.models.Department || mongoose.model("Department", DepartmentSchema);
