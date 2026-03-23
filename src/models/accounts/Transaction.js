// 📁 src/models/accounts/Transaction.js
// Transaction = Every money movement in the system
// Journal Entry, Payment, Receipt, Sales, Purchase — sab yahan record hote hain
// Double-entry bookkeeping: har transaction mein Debit = Credit

import mongoose from "mongoose";

// ── Journal Line (one side of double entry) ───────────────────
// Har transaction mein kam se kam 2 lines hoti hain
const JournalLineSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AccountHead",
    required: true,
  },

  accountName: {
    type: String, // snapshot at time of entry
  },

  type: {
    type: String,
    enum: ["Debit", "Credit"],
    required: true,
  },

  amount: {
    type: Number,
    required: true,
    min: 0,
  },

  description: {
    type: String,
    trim: true,
  },
}, { _id: true });

// ── Main Transaction Schema ───────────────────────────────────
const TransactionSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },

  // ── Transaction Identity ──────────────────────────────────
  transactionNumber: {
    type: String,
    required: true,
  }, // Auto-generated: TXN-2026-0001, JE-2026-0001, PAY-2026-0001

  date: {
    type: Date,
    required: true,
    default: Date.now,
  },

  // ── Transaction Type ──────────────────────────────────────
  type: {
    type: String,
    enum: [
      "Journal Entry",     // Manual double-entry
      "Payment",           // Money going OUT (paying supplier, expense)
      "Receipt",           // Money coming IN (receiving from customer)
      "Sales Invoice",     // Customer billed → Receivable Dr, Sales Cr
      "Purchase Invoice",  // Supplier billed → Purchase Dr, Payable Cr
      "Credit Note",       // Sales return
      "Debit Note",        // Purchase return
      "Contra",            // Bank to Cash or Cash to Bank transfer
      "Opening Balance",   // Initial balance entry
    ],
    required: true,
  },

  // ── Amount ────────────────────────────────────────────────
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },

  // ── Journal Lines (Double Entry) ─────────────────────────
  // Debit total must === Credit total (balanced entry)
  lines: [JournalLineSchema],

  // ── Reference Links ───────────────────────────────────────
  // Link to source document
  referenceType: {
    type: String,
    enum: [
      "SalesInvoice", "PurchaseInvoice", "SalesOrder",
      "PurchaseOrder", "Payroll", "Salary", "Manual", null
    ],
    default: "Manual",
  },

  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  }, // ID of linked document

  referenceNumber: {
    type: String,
  }, // Invoice number, PO number etc.

  // ── Party (Customer or Supplier) ─────────────────────────
  partyType: {
    type: String,
    enum: ["Customer", "Supplier", "Employee", null],
    default: null,
  },

  partyId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },

  partyName: {
    type: String,
  }, // snapshot

  // ── Payment Details ───────────────────────────────────────
  // Filled when type === "Payment" or "Receipt"
  paymentMode: {
    type: String,
    enum: ["Cash", "Bank Transfer", "Cheque", "UPI", "Card", "Other"],
  },

  bankAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AccountHead",
  }, // Which bank account used

  chequeNumber: { type: String },
  chequeDate:   { type: Date },
  utrNumber:    { type: String }, // UTR for bank transfers

  // ── Status ────────────────────────────────────────────────
  status: {
    type: String,
    enum: ["Draft", "Posted", "Cancelled"],
    default: "Posted",
  },

  // ── Narration / Notes ─────────────────────────────────────
  narration: {
    type: String,
    trim: true,
  }, // e.g. "Payment received from Acme Corp for Invoice INV-001"

  // ── Tax ───────────────────────────────────────────────────
  taxAmount:   { type: Number, default: 0 },
  taxType:     { type: String, enum: ["GST", "IGST", "CGST+SGST", "None"], default: "None" },
  taxRate:     { type: Number, default: 0 }, // percentage

  // ── Fiscal Year ───────────────────────────────────────────
  fiscalYear: {
    type: String,
  }, // e.g. "2025-26" — auto-set from date

  // ── Created by ────────────────────────────────────────────
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CompanyUser",
  },

}, { timestamps: true });

// ── Pre-save: auto-set fiscalYear ─────────────────────────────
TransactionSchema.pre("save", function (next) {
  if (this.date) {
    const d    = new Date(this.date);
    const year = d.getMonth() >= 3 // April = month 3 (0-indexed)
      ? d.getFullYear()
      : d.getFullYear() - 1;
    this.fiscalYear = `${year}-${String(year + 1).slice(2)}`;
    // Indian FY: April to March
    // e.g. April 2025 → "2025-26", March 2026 → "2025-26"
  }
  next();
});

// ── Indexes ───────────────────────────────────────────────────
TransactionSchema.index({ companyId: 1, date: -1 });
TransactionSchema.index({ companyId: 1, type: 1 });
TransactionSchema.index({ companyId: 1, "lines.accountId": 1 });
TransactionSchema.index({ companyId: 1, partyId: 1 });
TransactionSchema.index({ companyId: 1, fiscalYear: 1 });
TransactionSchema.index({ companyId: 1, transactionNumber: 1 }, { unique: true });
TransactionSchema.index({ referenceId: 1 }, { sparse: true });

export default mongoose.models.Transaction ||
  mongoose.model("Transaction", TransactionSchema);