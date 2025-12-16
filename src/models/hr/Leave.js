import mongoose from "mongoose";

const LeaveSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

 employeeId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Employee",
  required: true,
},

    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },

    leaveType: {
      type: String,
      enum: ["Casual", "Sick", "Paid", "Unpaid"],
      required: true,
    },

    reason: { type: String, required: true },

    attachmentUrl: { type: String }, // optional link (Drive / image / PDF)

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyUser",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Leave || mongoose.model("Leave", LeaveSchema);
