// 📁 src/app/api/accounts/transactions/route.js

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import Transaction from "@/models/accounts/Transaction";
import LedgerEntry from "@/models/accounts/LedgerEntry";
import AccountHead from "@/models/accounts/AccountHead";
import mongoose from "mongoose";

// ─── Auto generate transaction number ─────────────────────────
async function generateTxnNumber(companyId, type) {
  const prefixMap = {
    "Journal Entry":    "JE",
    "Payment":          "PAY",
    "Receipt":          "REC",
    "Sales Invoice":    "SI",
    "Purchase Invoice": "PI",
    "Credit Note":      "CN",
    "Debit Note":       "DN",
    "Contra":           "CTR",
    "Opening Balance":  "OB",
  };
  const prefix = prefixMap[type] || "TXN";
  const year   = new Date().getFullYear();
  const count  = await Transaction.countDocuments({ companyId, type }) + 1;
  return `${prefix}-${year}-${String(count).padStart(4, "0")}`;
}

// ─── Post ledger entries after transaction ────────────────────
async function postLedgerEntries(transaction) {
  const entries = [];

  // Get running balance for each account
  for (const line of transaction.lines) {
    const last = await LedgerEntry.findOne(
      { companyId: transaction.companyId, accountId: line.accountId },
      { balance: 1 },
      { sort: { date: -1, createdAt: -1 } }
    );

    const prevBalance = last?.balance || 0;
    const account     = await AccountHead.findById(line.accountId);
    const isDebitNormal = account?.balanceType === "Debit";

    // Balance calculation:
    // Debit normal accounts (Asset, Expense): Debit increases, Credit decreases
    // Credit normal accounts (Liability, Equity, Income): Credit increases, Debit decreases
    let newBalance;
    if (isDebitNormal) {
      newBalance = prevBalance + (line.type === "Debit" ? line.amount : -line.amount);
    } else {
      newBalance = prevBalance + (line.type === "Credit" ? line.amount : -line.amount);
    }

    entries.push({
      companyId:         transaction.companyId,
      accountId:         line.accountId,
      accountName:       line.accountName || account?.name,
      transactionId:     transaction._id,
      transactionNumber: transaction.transactionNumber,
      transactionType:   transaction.type,
      date:              transaction.date,
      debit:             line.type === "Debit"  ? line.amount : 0,
      credit:            line.type === "Credit" ? line.amount : 0,
      balance:           newBalance,
      narration:         transaction.narration,
      partyName:         transaction.partyName,
      partyType:         transaction.partyType,
      fiscalYear:        transaction.fiscalYear,
    });
  }

  await LedgerEntry.insertMany(entries);
}

// ─── GET /api/accounts/transactions ──────────────────────────
export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "Journal Entry", "view") && !hasPermission(user, "Accounts", "view"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const type       = searchParams.get("type");
    const fromDate   = searchParams.get("fromDate");
    const toDate     = searchParams.get("toDate");
    const partyId    = searchParams.get("partyId");
    const fiscalYear = searchParams.get("fiscalYear");
    const page       = parseInt(searchParams.get("page") || "1");
    const limit      = parseInt(searchParams.get("limit") || "50");

    const query = { companyId: user.companyId, status: { $ne: "Cancelled" } };
    if (type)       query.type       = type;
    if (partyId)    query.partyId    = partyId;
    if (fiscalYear) query.fiscalYear = fiscalYear;
    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = new Date(fromDate);
      if (toDate)   query.date.$lte = new Date(toDate + "T23:59:59");
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate("lines.accountId", "name type")
        .populate("bankAccountId", "name")
        .sort({ date: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Transaction.countDocuments(query),
    ]);

    return NextResponse.json({ success: true, data: transactions, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error("GET /api/accounts/transactions error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ─── POST /api/accounts/transactions ─────────────────────────
export async function POST(req) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "Journal Entry", "create") && !hasPermission(user, "Accounts", "create"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { type, date, lines, narration, partyType, partyId, partyName,
            paymentMode, bankAccountId, chequeNumber, chequeDate, utrNumber,
            referenceType, referenceId, referenceNumber, taxAmount, taxType, taxRate } = body;

    if (!type || !lines || lines.length < 2)
      return NextResponse.json({ success: false, message: "type and at least 2 lines required" }, { status: 400 });

    // ✅ Validate balanced entry — Debit must equal Credit
    const totalDebit  = lines.filter(l => l.type === "Debit").reduce((s, l) => s + Number(l.amount), 0);
    const totalCredit = lines.filter(l => l.type === "Credit").reduce((s, l) => s + Number(l.amount), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01)
      return NextResponse.json({
        success: false,
        message: `Unbalanced entry — Debit ₹${totalDebit} ≠ Credit ₹${totalCredit}`,
      }, { status: 400 });

    // Get account names for snapshot
    const accountIds = lines.map(l => l.accountId);
    const accounts   = await AccountHead.find({ _id: { $in: accountIds } }).select("name balanceType");
    const accountMap = Object.fromEntries(accounts.map(a => [a._id.toString(), a]));

    const linesWithNames = lines.map(l => ({
      ...l,
      amount:      Number(l.amount),
      accountName: accountMap[l.accountId]?.name || "",
    }));

    const transactionNumber = await generateTxnNumber(user.companyId, type);

    const [transaction] = await Transaction.create([{
      companyId: user.companyId,
      transactionNumber,
      type,
      date:        date ? new Date(date) : new Date(),
      totalAmount: totalDebit,
      lines:       linesWithNames,
      narration,
      partyType:   partyType    || null,
      partyId:     partyId      || null,
      partyName:   partyName    || "",
      paymentMode: paymentMode  || null,
      bankAccountId: bankAccountId || null,
      chequeNumber,chequeDate,utrNumber,
      referenceType: referenceType || "Manual",
      referenceId:   referenceId   || null,
      referenceNumber,
      taxAmount:   taxAmount    || 0,
      taxType:     taxType      || "None",
      taxRate:     taxRate      || 0,
      status:      "Posted",
      createdBy:   user.id,
    }], { session });

    // ✅ Post ledger entries
    await postLedgerEntries(transaction);

    await session.commitTransaction();
    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (err) {
    await session.abortTransaction();
    console.error("POST /api/accounts/transactions error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  } finally {
    session.endSession();
  }
}