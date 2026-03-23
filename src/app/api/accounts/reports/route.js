// 📁 src/app/api/accounts/reports/route.js
// All financial reports from one endpoint using ?type= param

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import LedgerEntry from "@/models/accounts/LedgerEntry";
import Transaction from "@/models/accounts/Transaction";
import AccountHead from "@/models/accounts/AccountHead";

// ─── GET /api/accounts/reports?type=trial-balance&fiscalYear=2025-26
export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("type");       // required
    const fiscalYear = searchParams.get("fiscalYear"); // e.g. "2025-26"
    const fromDate   = searchParams.get("fromDate");
    const toDate     = searchParams.get("toDate");
    const partyType  = searchParams.get("partyType");  // "Customer" | "Supplier"

    const companyId = user.companyId;

    // ── Helper: get closing balance per account ──────────────
    async function getAccountBalances(filter = {}) {
      const match = { companyId, ...filter };
      const result = await LedgerEntry.aggregate([
        { $match: match },
        { $sort: { accountId: 1, date: 1, createdAt: 1 } },
        { $group: {
            _id: "$accountId",
            accountName: { $last: "$accountName" },
            totalDebit:  { $sum: "$debit" },
            totalCredit: { $sum: "$credit" },
            closingBalance: { $last: "$balance" },
        }},
        { $lookup: {
            from: "accountheads",
            localField: "_id",
            foreignField: "_id",
            as: "account",
        }},
        { $unwind: { path: "$account", preserveNullAndEmpty: true } },
        { $project: {
            accountName:    { $ifNull: ["$account.name", "$accountName"] },
            type:           "$account.type",
            group:          "$account.group",
            balanceType:    "$account.balanceType",
            totalDebit:     1,
            totalCredit:    1,
            closingBalance: 1,
        }},
        { $sort: { type: 1, accountName: 1 } },
      ]);
      return result;
    }

    // ── TRIAL BALANCE ────────────────────────────────────────
    if (reportType === "trial-balance") {
      const filter = {};
      if (fiscalYear) filter.fiscalYear = fiscalYear;
      if (fromDate)   filter.date = { $gte: new Date(fromDate) };
      if (toDate)     filter.date = { ...(filter.date || {}), $lte: new Date(toDate + "T23:59:59") };

      const balances = await getAccountBalances(filter);
      const totalDebit  = balances.reduce((s, b) => s + b.totalDebit, 0);
      const totalCredit = balances.reduce((s, b) => s + b.totalCredit, 0);

      return NextResponse.json({
        success: true,
        report: "Trial Balance",
        fiscalYear, data: balances,
        totals: { debit: totalDebit, credit: totalCredit },
      });
    }

    // ── PROFIT & LOSS ────────────────────────────────────────
    if (reportType === "profit-loss") {
      const filter = { "account.type": { $in: ["Income", "Expense"] } };
      if (fiscalYear) filter.fiscalYear = fiscalYear;
      if (fromDate)   filter.date = { $gte: new Date(fromDate) };
      if (toDate)     filter.date = { ...(filter.date || {}), $lte: new Date(toDate + "T23:59:59") };

      const balances = await getAccountBalances(
        fiscalYear ? { fiscalYear } : fromDate ? { date: { $gte: new Date(fromDate), $lte: new Date(toDate + "T23:59:59") } } : {}
      );

      const income   = balances.filter(b => b.type === "Income");
      const expenses = balances.filter(b => b.type === "Expense");

      const totalIncome   = income.reduce((s, i) => s + Math.abs(i.closingBalance), 0);
      const totalExpenses = expenses.reduce((s, e) => s + Math.abs(e.closingBalance), 0);
      const netProfit     = totalIncome - totalExpenses;

      return NextResponse.json({
        success: true,
        report: "Profit & Loss",
        fiscalYear,
        data: { income, expenses },
        totals: { totalIncome, totalExpenses, netProfit },
      });
    }

    // ── BALANCE SHEET ────────────────────────────────────────
    if (reportType === "balance-sheet") {
      const balances = await getAccountBalances(fiscalYear ? { fiscalYear } : {});

      const assets      = balances.filter(b => b.type === "Asset");
      const liabilities = balances.filter(b => b.type === "Liability");
      const equity      = balances.filter(b => b.type === "Equity");

      // Include retained earnings (net profit) in equity
      const incomeBalances  = balances.filter(b => b.type === "Income");
      const expenseBalances = balances.filter(b => b.type === "Expense");
      const retainedEarnings = incomeBalances.reduce((s, i) => s + Math.abs(i.closingBalance), 0)
                             - expenseBalances.reduce((s, e) => s + Math.abs(e.closingBalance), 0);

      const totalAssets      = assets.reduce((s, a) => s + Math.abs(a.closingBalance), 0);
      const totalLiabilities = liabilities.reduce((s, l) => s + Math.abs(l.closingBalance), 0);
      const totalEquity      = equity.reduce((s, e) => s + Math.abs(e.closingBalance), 0) + retainedEarnings;

      return NextResponse.json({
        success: true,
        report: "Balance Sheet",
        fiscalYear,
        data: { assets, liabilities, equity },
        totals: { totalAssets, totalLiabilities, totalEquity, retainedEarnings },
        balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1,
      });
    }

    // ── GENERAL LEDGER (single account statement) ─────────────
    if (reportType === "ledger") {
      const accountId = searchParams.get("accountId");
      if (!accountId) return NextResponse.json({ success: false, message: "accountId required" }, { status: 400 });

      const filter = { companyId, accountId: new (await import("mongoose")).default.Types.ObjectId(accountId) };
      if (fiscalYear) filter.fiscalYear = fiscalYear;
      if (fromDate)   filter.date = { $gte: new Date(fromDate) };
      if (toDate)     filter.date = { ...(filter.date || {}), $lte: new Date(toDate + "T23:59:59") };

      const entries = await LedgerEntry.find(filter)
        .populate("transactionId", "transactionNumber type")
        .sort({ date: 1, createdAt: 1 });

      const account    = await AccountHead.findById(accountId);
      const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
      const totalCredit= entries.reduce((s, e) => s + e.credit, 0);
      const closing    = entries.at(-1)?.balance || 0;

      return NextResponse.json({
        success: true,
        report: "General Ledger",
        account, entries,
        totals: { totalDebit, totalCredit, closingBalance: closing },
      });
    }

    // ── AGEING REPORT (Customer or Supplier) ─────────────────
    if (reportType === "ageing") {
      const type = partyType || "Customer"; // "Customer" | "Supplier"

      // Get all unpaid transactions for the party type
      const txns = await Transaction.find({
        companyId,
        partyType: type,
        type: type === "Customer" ? "Sales Invoice" : "Purchase Invoice",
        status: "Posted",
      }).sort({ date: 1 });

      const today = new Date();
      const aged  = txns.map(t => {
        const days = Math.floor((today - new Date(t.date)) / (1000 * 60 * 60 * 24));
        return {
          _id:               t._id,
          partyName:         t.partyName,
          transactionNumber: t.transactionNumber,
          date:              t.date,
          amount:            t.totalAmount,
          daysOutstanding:   days,
          bucket: days <= 30 ? "0-30 days"
                : days <= 60 ? "31-60 days"
                : days <= 90 ? "61-90 days"
                : "90+ days",
        };
      });

      const buckets = {
        "0-30 days":  aged.filter(a => a.bucket === "0-30 days").reduce((s, a) => s + a.amount, 0),
        "31-60 days": aged.filter(a => a.bucket === "31-60 days").reduce((s, a) => s + a.amount, 0),
        "61-90 days": aged.filter(a => a.bucket === "61-90 days").reduce((s, a) => s + a.amount, 0),
        "90+ days":   aged.filter(a => a.bucket === "90+ days").reduce((s, a) => s + a.amount, 0),
      };

      return NextResponse.json({
        success: true,
        report: `${type} Ageing`,
        data: aged, buckets,
        total: aged.reduce((s, a) => s + a.amount, 0),
      });
    }

    return NextResponse.json({ success: false, message: "Invalid report type. Use: trial-balance, profit-loss, balance-sheet, ledger, ageing" }, { status: 400 });

  } catch (err) {
    console.error("GET /api/accounts/reports error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}