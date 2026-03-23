// 📁 src/models/accounts/AccountHead.js
// Account Head = Chart of Accounts (COA)
// Har company ka apna account chart hota hai
// Example: Cash, Bank, Sales, Purchase, Salary Expense etc.

import mongoose from "mongoose";

const AccountHeadSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },

  // ── Account Identity ──────────────────────────────────────
  name: {
    type: String,
    required: true,
    trim: true,
  }, // e.g. "Cash in Hand", "Sales Revenue", "Accounts Receivable"

  code: {
    type: String,
    trim: true,
  }, // e.g. "1001", "2001", "4001" — optional ledger code

  // ── Account Type (Top Level Classification) ──────────────
  // These 5 are standard double-entry bookkeeping types
  type: {
    type: String,
    enum: [
      "Asset",       // Cash, Bank, Receivables, Inventory, Fixed Assets
      "Liability",   // Payables, Loans, Credit Cards
      "Equity",      // Owner Capital, Retained Earnings
      "Income",      // Sales, Service Revenue, Interest Income
      "Expense",     // Salary, Rent, Purchase, Utilities
    ],
    required: true,
  },

  // ── Account Group (Sub-classification) ───────────────────
  group: {
    type: String,
    enum: [
      // Asset groups
      "Current Asset",        // Cash, Bank, Receivables, Inventory
      "Fixed Asset",          // Machinery, Furniture, Vehicles
      "Other Asset",          // Deposits, Prepaid Expenses

      // Liability groups
      "Current Liability",    // Payables, Short-term loans
      "Long Term Liability",  // Bank Loans, Mortgages

      // Equity groups
      "Capital",              // Owner's investment
      "Reserve",              // Retained earnings, reserves

      // Income groups
      "Direct Income",        // Sales, Service Revenue
      "Indirect Income",      // Interest, Commission received

      // Expense groups
      "Direct Expense",       // Purchase, Cost of Goods Sold
      "Indirect Expense",     // Salary, Rent, Utilities, Marketing
    ],
  },

  // ── Parent Account (for hierarchy) ───────────────────────
  // Example: "HDFC Bank Account" → parent: "Bank Accounts" → parent: "Assets"
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AccountHead",
    default: null,
  },

  // ── Balance Type ──────────────────────────────────────────
  // Asset & Expense → Debit balance (increases with debit)
  // Liability, Equity, Income → Credit balance (increases with credit)
  balanceType: {
    type: String,
    enum: ["Debit", "Credit"],
    required: true,
  },

  // ── Opening Balance ───────────────────────────────────────
  openingBalance: {
    type: Number,
    default: 0,
  },

  openingBalanceDate: {
    type: Date,
  },

  // ── Bank Account specific fields ──────────────────────────
  // Only filled when group === "Current Asset" and it's a bank account
  bankDetails: {
    bankName:      { type: String },
    accountNumber: { type: String },
    ifscCode:      { type: String },
    branch:        { type: String },
  },

  // ── Flags ─────────────────────────────────────────────────
  isActive: {
    type: Boolean,
    default: true,
  },

  isSystemAccount: {
    type: Boolean,
    default: false,
    // true for auto-created accounts like "Accounts Receivable", "Accounts Payable"
    // System accounts cannot be deleted
  },

  description: {
    type: String,
    trim: true,
  },

}, { timestamps: true });

// Unique account name per company
AccountHeadSchema.index({ companyId: 1, name: 1 }, { unique: true });
AccountHeadSchema.index({ companyId: 1, code: 1 }, { sparse: true });
AccountHeadSchema.index({ companyId: 1, type: 1 });
AccountHeadSchema.index({ companyId: 1, group: 1 });

export default mongoose.models.AccountHead ||
  mongoose.model("AccountHead", AccountHeadSchema);