// models/MaintenanceBill.js
import mongoose from "mongoose";

const maintenanceBillSchema = new mongoose.Schema({
  societyId: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" }, // agency
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: "Building" }, // optional
  flatId: { type: mongoose.Schema.Types.ObjectId, ref: "Flat", required: true },
  residentId: { type: mongoose.Schema.Types.ObjectId, ref: "Resident" }, // optional

  billPeriod: { type: String, required: true }, // "2026-05" (YYYY-MM)
  billDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },

  items: [
    {
      description: { type: String, required: true }, // "Common Area Maintenance"
      amount: { type: Number, required: true },
    },
  ],
  totalAmount: { type: Number, required: true },
  lateFee: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ["Pending", "PartiallyPaid", "Paid", "Overdue"],
    default: "Pending",
  },
  paymentMode: { type: String, enum: ["Cash", "Online", "Cheque", "Other"] },
  transactionId: String,
  paidAt: Date,
  remarks: String,
}, { timestamps: true });

maintenanceBillSchema.index({ flatId: 1, billPeriod: 1 }, { unique: true });
maintenanceBillSchema.index({ societyId: 1, paymentStatus: 1 });

export default mongoose.models.MaintenanceBill || mongoose.model("MaintenanceBill", maintenanceBillSchema);