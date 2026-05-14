// 📁 src/models/accounts/LedgerEntry.js
// Ledger = Account ka running balance record
// Har AccountHead ka apna ledger hota hai
// Transaction post hone ke baad ledger entries automatically create hoti hain

import mongoose from "mongoose";

const LedgerEntrySchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },

  // ── Which account ─────────────────────────────────────────
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AccountHead",
    required: true,
  },

  accountName: {
    type: String,
  }, // snapshot

  // ── Transaction link ──────────────────────────────────────
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Transaction",
    required: true,
  },

  transactionNumber: {
    type: String,
  },

  transactionType: {
    type: String,
  }, // "Payment", "Journal Entry" etc.

  date: {
    type: Date,
    required: true,
  },

  // ── Entry ─────────────────────────────────────────────────
  debit:  { type: Number, default: 0 },
  credit: { type: Number, default: 0 },

  // Running balance after this entry
  // Positive = Debit balance, Negative = Credit balance
  balance: {
    type: Number,
    default: 0,
  },

  narration: {
    type: String,
    trim: true,
  },

  // ── Party reference ───────────────────────────────────────
  partyName: { type: String },
  partyType: { type: String },

  fiscalYear: { type: String },

}, { timestamps: true });

LedgerEntrySchema.index({ companyId: 1, accountId: 1, date: 1 });
LedgerEntrySchema.index({ companyId: 1, transactionId: 1 });
LedgerEntrySchema.index({ companyId: 1, fiscalYear: 1, accountId: 1 });

export default mongoose.models.LedgerEntry ||
  mongoose.model("LedgerEntry", LedgerEntrySchema);