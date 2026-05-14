import { NextResponse } from "next/server";
import mongoose from "mongoose";
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
    const bankAccountId = searchParams.get("bankAccountId");
    const asOfDate = searchParams.get("asOfDate") || new Date().toISOString().slice(0, 10);
    const statementBalance = parseFloat(searchParams.get("statementBalance") || "0");

    if (!bankAccountId || !mongoose.Types.ObjectId.isValid(bankAccountId)) {
      return NextResponse.json({ success: false, message: "Valid bankAccountId required" }, { status: 400 });
    }

    const companyId = new mongoose.Types.ObjectId(user.companyId);
    const endDate = new Date(asOfDate);
    endDate.setHours(23, 59, 59, 999);

    // Get bank ledger entries up to asOfDate
    const entries = await LedgerEntry.find({
      companyId,
      accountId: new mongoose.Types.ObjectId(bankAccountId),
      date: { $lte: endDate },
    }).sort({ date: 1 });

    let bookBalance = 0;
    entries.forEach(e => { bookBalance += e.debit - e.credit; });

    const difference = bookBalance - statementBalance;

    return NextResponse.json({
      success: true,
      bankAccountId,
      asOfDate,
      bookBalance,
      statementBalance,
      difference,
      reconciled: Math.abs(difference) < 0.01,
    });
  } catch (err) {
    console.error("Bank reconciliation error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}