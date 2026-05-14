import mongoose from "mongoose";

const BudgetSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: "AccountHead", required: true },
  fiscalYear: { type: String, required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["Income", "Expense"] },
  monthWise: [{ month: Number, amount: Number }],
}, { timestamps: true });

BudgetSchema.index({ companyId: 1, accountId: 1, fiscalYear: 1 }, { unique: true });
export default mongoose.models.Budget || mongoose.model("Budget", BudgetSchema);