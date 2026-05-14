import { NextResponse } from "next/server";
import mongoose from "mongoose";
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
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const companyId = new mongoose.Types.ObjectId(user.companyId);
    const match = { companyId, status: "Posted" };
    if (fiscalYear) match.fiscalYear = fiscalYear;
    if (fromDate || toDate) {
      match.date = {};
      if (fromDate) match.date.$gte = new Date(fromDate);
      if (toDate) match.date.$lte = new Date(toDate + "T23:59:59");
    }

    // Get all ledger entries grouped by account type
    const pipeline = [
      { $match: match },
      { $unwind: "$lines" },
      {
        $lookup: {
          from: "accountheads",
          localField: "lines.accountId",
          foreignField: "_id",
          as: "account",
        },
      },
      { $unwind: "$account" },
      {
        $group: {
          _id: "$account.type",
          totalAmount: { $sum: "$lines.amount" },
        },
      },
    ];
    const aggregates = await LedgerEntry.aggregate(pipeline);
    const map = { Asset: 0, Liability: 0, Equity: 0, Income: 0, Expense: 0 };
    aggregates.forEach((a) => { map[a._id] = Math.abs(a.totalAmount); });

    // Simplified cash flow: Operating = Income - Expenses; Investing = Asset changes; Financing = Equity + Liability changes
    const operating = (map.Income - map.Expense);
    const investing = -map.Asset;   // purchase of assets = cash outflow
    const financing = map.Equity + map.Liability;

    const netCashFlow = operating + investing + financing;

    return NextResponse.json({
      success: true,
      data: { operating, investing, financing, netCashFlow },
    });
  } catch (err) {
    console.error("Cash Flow error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}