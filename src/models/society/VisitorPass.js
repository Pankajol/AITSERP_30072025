// models/society/VisitorPass.js
import mongoose from "mongoose";

const VisitorPassSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  societyId: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: "Building" },
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: "Resident" },
  flatId: { type: mongoose.Schema.Types.ObjectId, ref: "Flat" },
  visitorName: { type: String, required: true },
  phone: String,
  vehicleNumber: String,
  purpose: String,
  validFrom: { type: Date, required: true },
  validTill: { type: Date, required: true },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected", "Used", "Expired"],
    default: "Pending",
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
  rejectionReason: String,
  usedAt: Date,
}, { timestamps: true });

export default mongoose.models.VisitorPass || mongoose.model("VisitorPass", VisitorPassSchema);