import mongoose from "mongoose";

const LeaveBalanceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CompanyUser",
      required: true,
      unique: true,
    },

    casual: { type: Number, default: 12 },
    sick: { type: Number, default: 8 },
    paid: { type: Number, default: 15 },
    unpaid: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.LeaveBalance ||
  mongoose.model("LeaveBalance", LeaveBalanceSchema);
