import mongoose from "mongoose";

const LeaveSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" }, // ✅ FIXED
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
    startDate: Date,
    endDate: Date,
    reason: String,
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
  },
  { timestamps: true }
);

export default mongoose.models.Leave ||
  mongoose.model("Leave", LeaveSchema);
