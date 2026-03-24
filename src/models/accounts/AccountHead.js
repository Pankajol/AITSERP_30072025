// 📁 src/models/accounts/AccountHead.js
import mongoose from "mongoose";

const AccountHeadSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },

  name: {
    type: String,
    required: true,
    trim: true,
  },

  code: {
    type: String,
    trim: true,
    // ✅ FIX: sparse index sirf null/undefined pe skip karta hai
    // "" empty string ko null mein convert karo — setter lagao
    set: (v) => (v && v.trim() !== "" ? v.trim() : undefined),
  },

  type: {
    type: String,
    enum: ["Asset", "Liability", "Equity", "Income", "Expense"],
    required: true,
  },

  group: {
    type: String,
    enum: [
      "Current Asset", "Fixed Asset", "Other Asset",
      "Current Liability", "Long Term Liability",
      "Capital", "Reserve",
      "Direct Income", "Indirect Income",
      "Direct Expense", "Indirect Expense",
    ],
  },

  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AccountHead",
    default: null,
  },

  balanceType: {
    type: String,
    enum: ["Debit", "Credit"],
    required: true,
  },

  openingBalance: {
    type: Number,
    default: 0,
  },

  openingBalanceDate: {
    type: Date,
  },

  bankDetails: {
    bankName:      { type: String },
    accountNumber: { type: String },
    ifscCode:      { type: String },
    branch:        { type: String },
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  isSystemAccount: {
    type: Boolean,
    default: false,
  },

  description: {
    type: String,
    trim: true,
  },

}, { timestamps: true });

// ✅ name unique per company (active + inactive dono mein — intentional)
AccountHeadSchema.index({ companyId: 1, name: 1 }, { unique: true });

// ✅ code sparse — sirf tab index hoga jab code null/undefined nahi hai
// Setter ki wajah se "" kabhi store nahi hoga, toh duplicate "" issue khatam
AccountHeadSchema.index({ companyId: 1, code: 1 }, { unique: true, sparse: true });

AccountHeadSchema.index({ companyId: 1, type: 1 });
AccountHeadSchema.index({ companyId: 1, group: 1 });

export default mongoose.models.AccountHead ||
  mongoose.model("AccountHead", AccountHeadSchema);