import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Budget from "@/models/Budget";
import LedgerEntry from "@/models/accounts/LedgerEntry";
import AccountHead from "@/models/accounts/AccountHead";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const fiscalYear = searchParams.get("fiscalYear");
    if (!fiscalYear) return NextResponse.json({ success: false, message: "fiscalYear required" }, { status: 400 });

    const companyId = new mongoose.Types.ObjectId(user.companyId);
    const budgets = await Budget.find({ companyId, fiscalYear }).populate("accountId", "name code type");

    const actuals = await LedgerEntry.aggregate([
      { $match: { companyId, fiscalYear } },
      {
        $group: {
          _id: "$accountId",
          totalDebit: { $sum: "$debit" },
          totalCredit: { $sum: "$credit" },
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
      { $unwind: "$account" },
    ]);

    const variance = budgets.map(b => {
      const actual = actuals.find(a => a._id.toString() === b.accountId.toString());
      const actualAmount =
        b.type === "Income" ? (actual?.totalCredit || 0) : (actual?.totalDebit || 0);
      const varianceAmount = actualAmount - b.amount;
      const variancePercent = b.amount ? (varianceAmount / b.amount) * 100 : 0;
      return {
        accountId: b.accountId._id,
        accountName: b.accountId.name,
        code: b.accountId.code,
        type: b.type,
        budgetAmount: b.amount,
        actualAmount,
        variance: varianceAmount,
        variancePercent: variancePercent.toFixed(2),
        status: varianceAmount >= 0 ? (b.type === "Income" ? "Favorable" : "Unfavorable") : (b.type === "Income" ? "Unfavorable" : "Favorable"),
      };
    });

    return NextResponse.json({ success: true, data: variance });
  } catch (err) {
    console.error("Budget variance error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}