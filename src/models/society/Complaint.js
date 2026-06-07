// models/Complaint.js
import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema({
  societyId: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" }, // agency

  // Complaint by Resident
  flatId: { type: mongoose.Schema.Types.ObjectId, ref: "Flat", required: true },
  raisedBy: {
    name: String,
    phone: String,
    email: String,
  }, // resident ki info (userId optional)
  category: {
    type: String,
    enum: ["Plumbing", "Electrical", "Cleaning", "Security", "CommonArea", "Other"],
    required: true,
  },
  subCategory: String,
  description: { type: String, required: true },
  priority: { type: String, enum: ["Low", "Medium", "High", "Emergency"], default: "Medium" },
  status: {
    type: String,
    enum: ["Pending", "Assigned", "InProgress", "Resolved", "Closed"],
    default: "Pending",
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null }, // guard/housekeeper ya koi staff
  resolution: String,
  resolvedAt: Date,
  attachments: [String], // URLs
}, { timestamps: true });

complaintSchema.index({ societyId: 1, status: 1 });
complaintSchema.index({ flatId: 1, createdAt: -1 });

export default mongoose.models.Complaint || mongoose.model("Complaint", complaintSchema);