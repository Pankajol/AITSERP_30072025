import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import LedgerEntry from "@/models/accounts/LedgerEntry";
import AccountHead from "@/models/accounts/AccountHead";
import Transaction from "@/models/accounts/Transaction";
import mongoose from "mongoose";

export async function GET(req, context) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    let { accountId } = params;

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      return NextResponse.json({ success: false, message: "Invalid account ID format" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const fromDate   = searchParams.get("fromDate");
    const toDate     = searchParams.get("toDate");
    const fiscalYear = searchParams.get("fiscalYear");
    const limit      = parseInt(searchParams.get("limit") || "100");
    const page       = parseInt(searchParams.get("page") || "1");

    const filter = {
      companyId: user.companyId,
      accountId: new mongoose.Types.ObjectId(accountId),
    };
    
    if (fiscalYear) filter.fiscalYear = fiscalYear;
    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = new Date(fromDate);
      if (toDate)   filter.date.$lte = new Date(toDate + "T23:59:59");
    }

    const [account, entries, totalCount] = await Promise.all([
      AccountHead.findOne({ _id: accountId, companyId: user.companyId }),
      LedgerEntry.find(filter)
        .populate("transactionId", "transactionNumber type referenceNumber referenceId")
        .sort({ date: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      LedgerEntry.countDocuments(filter),
    ]);

    if (!account) {
      return NextResponse.json({ success: false, message: "Account not found" }, { status: 404 });
    }

    // Calculate summary from all entries (not paginated)
    const allEntries = await LedgerEntry.find(filter).sort({ date: 1, createdAt: 1 });
    
    const openingBalance = allEntries[0]?.balance
      ? allEntries[0].balance - allEntries[0].debit + allEntries[0].credit
      : account.openingBalance || 0;
    
    const totalDebit   = allEntries.reduce((s, e) => s + e.debit, 0);
    const totalCredit  = allEntries.reduce((s, e) => s + e.credit, 0);
    const closingBalance = allEntries.at(-1)?.balance ?? openingBalance;

    // Format entries for response
    const formattedEntries = entries.map(entry => ({
      _id: entry._id,
      date: entry.date,
      transactionNumber: entry.transactionNumber,
      transactionType: entry.transactionType,
      narration: entry.narration,
      debit: entry.debit,
      credit: entry.credit,
      balance: entry.balance,
      transaction: entry.transactionId ? {
        _id: entry.transactionId._id,
        number: entry.transactionId.transactionNumber,
        type: entry.transactionId.type,
        referenceNumber: entry.transactionId.referenceNumber,
      } : null,
    }));

    return NextResponse.json({
      success: true,
      account: {
        _id: account._id,
        name: account.name,
        code: account.code,
        type: account.type,
        group: account.group,
        balanceType: account.balanceType,
        openingBalance: account.openingBalance,
      },
      entries: formattedEntries,
      summary: { 
        openingBalance, 
        totalDebit, 
        totalCredit, 
        closingBalance,
        totalEntries: totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (err) {
    console.error("GET /api/accounts/ledger/[accountId] error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}