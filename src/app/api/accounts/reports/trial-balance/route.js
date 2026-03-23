// 📁 src/app/api/accounts/reports/trial-balance/route.js

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import LedgerEntry from "@/models/accounts/LedgerEntry";
import AccountHead from "@/models/accounts/AccountHead";

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

    // Aggregate closing balance per account
    const balances = await LedgerEntry.aggregate([
      { $match: match },
      { $sort: { accountId: 1, date: 1, createdAt: 1 } },
      { $group: {
          _id:            "$accountId",
          accountName:    { $last: "$accountName" },
          totalDebit:     { $sum: "$debit" },
          totalCredit:    { $sum: "$credit" },
          closingBalance: { $last: "$balance" },
      }},
      { $lookup: {
          from: "accountheads", localField: "_id", foreignField: "_id", as: "account",
      }},
      { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
      { $project: {
          accountName:    { $ifNull: ["$account.name", "$accountName"] },
          code:           "$account.code",
          type:           "$account.type",
          group:          "$account.group",
          balanceType:    "$account.balanceType",
          totalDebit:     1,
          totalCredit:    1,
          closingBalance: 1,
      }},
      { $sort: { type: 1, accountName: 1 } },
    ]);

    const totalDebit   = balances.reduce((s, b) => s + b.totalDebit,  0);
    const totalCredit  = balances.reduce((s, b) => s + b.totalCredit, 0);
    const isBalanced   = Math.abs(totalDebit - totalCredit) < 0.01;

    return NextResponse.json({
      success: true,
      report:  "Trial Balance",
      fiscalYear, fromDate, toDate,
      data:    balances,
      totals:  { totalDebit, totalCredit, isBalanced },
    });
  } catch (err) {
    console.error("GET trial-balance error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}