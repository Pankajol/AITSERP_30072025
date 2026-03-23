// 📁 src/app/api/accounts/payment/route.js
// Payment = Money going OUT (paying suppliers, expenses)
// Receipt = Money coming IN (receiving from customers)

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import Transaction from "@/models/accounts/Transaction";
import LedgerEntry from "@/models/accounts/LedgerEntry";
import AccountHead from "@/models/accounts/AccountHead";
import mongoose from "mongoose";

async function generateTxnNumber(companyId, type) {
  const prefix = type === "Payment" ? "PAY" : "REC";
  const year   = new Date().getFullYear();
  const count  = await Transaction.countDocuments({ companyId, type }) + 1;
  return `${prefix}-${year}-${String(count).padStart(4, "0")}`;
}

async function postLedgerEntries(transaction) {
  const entries = [];
  for (const line of transaction.lines) {
    const last    = await LedgerEntry.findOne(
      { companyId: transaction.companyId, accountId: line.accountId },
      { balance: 1 }, { sort: { date: -1, createdAt: -1 } }
    );
    const prevBalance   = last?.balance || 0;
    const account       = await AccountHead.findById(line.accountId);
    const isDebitNormal = account?.balanceType === "Debit";
    const newBalance    = isDebitNormal
      ? prevBalance + (line.type === "Debit" ? line.amount : -line.amount)
      : prevBalance + (line.type === "Credit" ? line.amount : -line.amount);

    entries.push({
      companyId: transaction.companyId, accountId: line.accountId,
      accountName: line.accountName || account?.name,
      transactionId: transaction._id, transactionNumber: transaction.transactionNumber,
      transactionType: transaction.type, date: transaction.date,
      debit:  line.type === "Debit"  ? line.amount : 0,
      credit: line.type === "Credit" ? line.amount : 0,
      balance: newBalance, narration: transaction.narration,
      partyName: transaction.partyName, partyType: transaction.partyType,
      fiscalYear: transaction.fiscalYear,
    });
  }
  await LedgerEntry.insertMany(entries);
}

// ─── GET /api/accounts/payment ────────────────────────────────
export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const txnType  = searchParams.get("type") || "Payment"; // "Payment" | "Receipt"
    const fromDate = searchParams.get("fromDate");
    const toDate   = searchParams.get("toDate");
    const partyId  = searchParams.get("partyId");

    const query = { companyId: user.companyId, type: txnType, status: { $ne: "Cancelled" } };
    if (partyId) query.partyId = partyId;
    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = new Date(fromDate);
      if (toDate)   query.date.$lte = new Date(toDate + "T23:59:59");
    }

    const payments = await Transaction.find(query)
      .populate("bankAccountId", "name")
      .populate("lines.accountId", "name type")
      .sort({ date: -1 });

    return NextResponse.json({ success: true, data: payments });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ─── POST /api/accounts/payment ───────────────────────────────
export async function POST(req) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "Payment Entry", "create") && !hasPermission(user, "Accounts", "create"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const {
      type,             // "Payment" or "Receipt"
      date,
      amount,
      bankAccountId,    // Which bank/cash account
      partyAccountId,   // Supplier (Payment) or Customer (Receipt) ledger account
      partyType,        // "Customer" | "Supplier"
      partyId,
      partyName,
      paymentMode,      // "Cash" | "Bank Transfer" | "Cheque" | "UPI" | "Card"
      narration,
      chequeNumber, chequeDate, utrNumber,
      referenceNumber,
    } = body;

    if (!type || !amount || !bankAccountId || !partyAccountId)
      return NextResponse.json({ success: false, message: "type, amount, bankAccountId, partyAccountId required" }, { status: 400 });

    // Get account names
    const [bankAcc, partyAcc] = await Promise.all([
      AccountHead.findById(bankAccountId),
      AccountHead.findById(partyAccountId),
    ]);

    // ✅ Auto build double-entry lines based on type
    // Payment (money going OUT): Debit Party/Expense, Credit Bank
    // Receipt (money coming IN): Debit Bank, Credit Party/Income
    const lines = type === "Payment"
      ? [
          { accountId: partyAccountId, accountName: partyAcc?.name, type: "Debit",  amount: Number(amount) },
          { accountId: bankAccountId,  accountName: bankAcc?.name,  type: "Credit", amount: Number(amount) },
        ]
      : [
          { accountId: bankAccountId,  accountName: bankAcc?.name,  type: "Debit",  amount: Number(amount) },
          { accountId: partyAccountId, accountName: partyAcc?.name, type: "Credit", amount: Number(amount) },
        ];

    const transactionNumber = await generateTxnNumber(user.companyId, type);

    const [transaction] = await Transaction.create([{
      companyId: user.companyId,
      transactionNumber, type,
      date:        date ? new Date(date) : new Date(),
      totalAmount: Number(amount),
      lines,
      narration,
      partyType: partyType || null,
      partyId:   partyId   || null,
      partyName: partyName || "",
      paymentMode: paymentMode || "Bank Transfer",
      bankAccountId,
      chequeNumber, chequeDate: chequeDate ? new Date(chequeDate) : null, utrNumber,
      referenceNumber,
      status: "Posted",
      createdBy: user.id,
    }], { session });

    await postLedgerEntries(transaction);

    await session.commitTransaction();
    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (err) {
    await session.abortTransaction();
    console.error("POST /api/accounts/payment error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  } finally {
    session.endSession();
  }
}