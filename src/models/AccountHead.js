import mongoose from "mongoose";

const AccountHeadSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "companyUser" },
    accountHeadCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    accountHeadDescription: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      required: true,
    },
  },
  { timestamps: true }
);

// If the model exists, use it. Otherwise, create a new model.
export default mongoose.models.AccountHead ||
  mongoose.model("AccountHead", AccountHeadSchema);
