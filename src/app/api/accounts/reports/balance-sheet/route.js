// 📁 src/app/api/accounts/reports/balance-sheet/route.js

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

    const match = { companyId: user.companyId };
    if (fiscalYear) match.fiscalYear = fiscalYear;

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
      { $project: {
          accountName: { $ifNull: ["$account.name", "$accountName"] },
          code:        "$account.code",
          type:        "$account.type",
          group:       "$account.group",
          totalDebit:  1, totalCredit: 1, closingBalance: 1,
      }},
      { $sort: { type: 1, group: 1, accountName: 1 } },
    ]);

    const assets      = balances.filter(b => b.type === "Asset");
    const liabilities = balances.filter(b => b.type === "Liability");
    const equity      = balances.filter(b => b.type === "Equity");
    const income      = balances.filter(b => b.type === "Income");
    const expenses    = balances.filter(b => b.type === "Expense");

    // Retained earnings = Net Profit added to Equity side
    const retainedEarnings =
      income.reduce((s, i)   => s + Math.abs(i.closingBalance), 0) -
      expenses.reduce((s, e) => s + Math.abs(e.closingBalance), 0);

    const totalAssets      = assets.reduce((s, a)      => s + Math.abs(a.closingBalance), 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + Math.abs(l.closingBalance), 0);
    const totalEquity      = equity.reduce((s, e)      => s + Math.abs(e.closingBalance), 0) + retainedEarnings;

    const groupBy = (arr) => arr.reduce((acc, item) => {
      const g = item.group || "Other";
      if (!acc[g]) acc[g] = { items: [], total: 0 };
      acc[g].items.push(item);
      acc[g].total += Math.abs(item.closingBalance);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      report:  "Balance Sheet",
      fiscalYear,
      data: {
        assets:      { accounts: assets,      grouped: groupBy(assets)      },
        liabilities: { accounts: liabilities, grouped: groupBy(liabilities) },
        equity:      { accounts: equity,      grouped: groupBy(equity), retainedEarnings },
      },
      totals: { totalAssets, totalLiabilities, totalEquity, retainedEarnings },
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1,
    });
  } catch (err) {
    console.error("GET balance-sheet error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}