// 📁 src/app/api/accounts/ledger/[accountId]/route.js

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import LedgerEntry from "@/models/accounts/LedgerEntry";
import AccountHead from "@/models/accounts/AccountHead";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const fromDate   = searchParams.get("fromDate");
    const toDate     = searchParams.get("toDate");
    const fiscalYear = searchParams.get("fiscalYear");

    const filter = {
      companyId: user.companyId,
      accountId: params.accountId,
    };
    if (fiscalYear) filter.fiscalYear = fiscalYear;
    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = new Date(fromDate);
      if (toDate)   filter.date.$lte = new Date(toDate + "T23:59:59");
    }

    const [account, entries] = await Promise.all([
      AccountHead.findOne({ _id: params.accountId, companyId: user.companyId }),
      LedgerEntry.find(filter)
        .populate("transactionId", "transactionNumber type referenceNumber")
        .sort({ date: 1, createdAt: 1 }),
    ]);

    if (!account)
      return NextResponse.json({ success: false, message: "Account not found" }, { status: 404 });

    const openingBalance = entries[0]?.balance
      ? entries[0].balance - entries[0].debit + entries[0].credit
      : account.openingBalance || 0;

    const totalDebit   = entries.reduce((s, e) => s + e.debit,  0);
    const totalCredit  = entries.reduce((s, e) => s + e.credit, 0);
    const closingBalance = entries.at(-1)?.balance ?? openingBalance;

    return NextResponse.json({
      success: true,
      account,
      entries,
      summary: { openingBalance, totalDebit, totalCredit, closingBalance },
    });
  } catch (err) {
    console.error("GET /api/accounts/ledger/[id] error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}