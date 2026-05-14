import mongoose from "mongoose";

const PerformanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },

  reviewMonth: { type: String, required: true },

  rating: { type: Number, min: 1, max: 5 },
  feedback: String,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" }

}, { timestamps: true });

export default mongoose.models.Performance || mongoose.model("Performance", PerformanceSchema);
