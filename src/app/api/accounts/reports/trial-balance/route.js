import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import Transaction from "@/models/accounts/Transaction";
import AccountHead from "@/models/accounts/AccountHead";
import { verifyJWT, getTokenFromHeader } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectDB();

    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const fiscalYear = searchParams.get("fiscalYear");

    const companyId = new mongoose.Types.ObjectId(user.companyId);
    const match = { companyId, status: "Posted" };

    if (fiscalYear) match.fiscalYear = fiscalYear;
    if (fromDate || toDate) {
      match.date = {};
      if (fromDate) match.date.$gte = new Date(fromDate);
      if (toDate) match.date.$lte = new Date(toDate + "T23:59:59");
    }

    const pipeline = [
      { $match: match },
      { $unwind: "$lines" },
      {
        $group: {
          _id: "$lines.accountId",
          totalDebit: {
            $sum: { $cond: [{ $eq: ["$lines.type", "Debit"] }, "$lines.amount", 0] },
          },
          totalCredit: {
            $sum: { $cond: [{ $eq: ["$lines.type", "Credit"] }, "$lines.amount", 0] },
          },
        },
      },
      {
        $lookup: {
          from: "accountheads",
          localField: "_id",
          foreignField: "_id",
          as: "account",
        },
      },
      { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          accountId: "$_id",
          accountName: "$account.name",
          code: "$account.code",
          type: "$account.type",
          group: "$account.group",
          balanceType: "$account.balanceType",
          parentId: "$account.parentId",          // ✅ CRITICAL for tree view
          totalDebit: 1,
          totalCredit: 1,
        },
      },
      { $sort: { type: 1, accountName: 1 } },
    ];

    const aggregates = await Transaction.aggregate(pipeline);

    const balances = aggregates.map((acc) => {
      let closing = 0;
      if (acc.balanceType === "Debit") {
        closing = acc.totalDebit - acc.totalCredit;
      } else {
        closing = acc.totalCredit - acc.totalDebit;
      }
      return { ...acc, closingBalance: closing };
    });

    const totalDebitBalances = balances.reduce(
      (sum, b) => sum + (b.closingBalance > 0 && b.balanceType === "Debit" ? b.closingBalance : 0),
      0
    );
    const totalCreditBalances = balances.reduce(
      (sum, b) => sum + (b.closingBalance > 0 && b.balanceType === "Credit" ? b.closingBalance : 0),
      0
    );

    return NextResponse.json({
      success: true,
      data: balances,
      totals: {
        totalDebit: totalDebitBalances,
        totalCredit: totalCreditBalances,
        isBalanced: Math.abs(totalDebitBalances - totalCreditBalances) < 0.01,
      },
    });
  } catch (err) {
    console.error("GET trial-balance error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}