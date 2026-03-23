// 📁 src/app/api/accounts/reports/profit-loss/route.js

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import LedgerEntry from "@/models/accounts/LedgerEntry";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const fiscalYear = searchParams.get("fiscalYear");
    const fromDate   = searchParams.get("fromDate");
    const toDate     = searchParams.get("toDate");

    const match = { companyId: user.companyId };
    if (fiscalYear) match.fiscalYear = fiscalYear;
    if (fromDate || toDate) {
      match.date = {};
      if (fromDate) match.date.$gte = new Date(fromDate);
      if (toDate)   match.date.$lte = new Date(toDate + "T23:59:59");
    }

    const balances = await LedgerEntry.aggregate([
      { $match: match },
      { $sort: { accountId: 1, date: 1, createdAt: 1 } },
      { $group: {
          _id: "$accountId",
          accountName:    { $last: "$accountName" },
          totalDebit:     { $sum: "$debit" },
          totalCredit:    { $sum: "$credit" },
          closingBalance: { $last: "$balance" },
      }},
      { $lookup: { from: "accountheads", localField: "_id", foreignField: "_id", as: "account" } },
      { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
      { $match: { "account.type": { $in: ["Income", "Expense"] } } },
      { $project: {
          accountName: { $ifNull: ["$account.name", "$accountName"] },
          code:        "$account.code",
          type:        "$account.type",
          group:       "$account.group",
          totalDebit:  1, totalCredit: 1, closingBalance: 1,
      }},
      { $sort: { type: 1, group: 1, accountName: 1 } },
    ]);

    const income   = balances.filter(b => b.type === "Income");
    const expenses = balances.filter(b => b.type === "Expense");

    // Income accounts are credit-normal → closing balance is the amount
    const totalIncome   = income.reduce((s, i)   => s + Math.abs(i.closingBalance), 0);
    const totalExpenses = expenses.reduce((s, e) => s + Math.abs(e.closingBalance), 0);
    const netProfit     = totalIncome - totalExpenses;

    // Group by group name
    const groupBy = (arr) => arr.reduce((acc, item) => {
      const g = item.group || "Other";
      if (!acc[g]) acc[g] = { items: [], total: 0 };
      acc[g].items.push(item);
      acc[g].total += Math.abs(item.closingBalance);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      report:  "Profit & Loss",
      fiscalYear, fromDate, toDate,
      data: {
        income:   { accounts: income,   grouped: groupBy(income)   },
        expenses: { accounts: expenses, grouped: groupBy(expenses) },
      },
      totals: { totalIncome, totalExpenses, netProfit, isProfit: netProfit >= 0 },
    });
  } catch (err) {
    console.error("GET profit-loss error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}