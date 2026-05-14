// 📁 src/app/api/accounts/ledger/route.js

import { NextResponse } from "next/server";
import connectDB        from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import LedgerEntry  from "@/models/accounts/LedgerEntry";
import AccountHead  from "@/models/accounts/AccountHead";

// ─── helpers ──────────────────────────────────────────────────
function getFiscalYear(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth(); // 0-indexed; April = 3
  return m >= 3 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
}

// ─── GET /api/accounts/ledger ─────────────────────────────────
// Query params:
//   accountId  — required
//   from       — ISO date (optional)
//   to         — ISO date (optional)
//   fiscalYear — e.g. "2024-25" (optional, overrides from/to)
//   page       — default 1
//   limit      — default 50
export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const accountId  = searchParams.get("accountId");
    const fiscalYear = searchParams.get("fiscalYear");
    const from       = searchParams.get("from");
    const to         = searchParams.get("to");
    const page       = Math.max(1, parseInt(searchParams.get("page")  || "1"));
    const limit      = Math.min(200, parseInt(searchParams.get("limit") || "50"));

    if (!accountId)
      return NextResponse.json({ success: false, message: "accountId is required" }, { status: 400 });

    // Verify account belongs to this company
    const account = await AccountHead.findOne({ _id: accountId, companyId: user.companyId, isActive: true });
    if (!account)
      return NextResponse.json({ success: false, message: "Account not found" }, { status: 404 });

    // Build date filter
    const query = { companyId: user.companyId, accountId };
    if (fiscalYear) {
      query.fiscalYear = fiscalYear;
    } else {
      if (from || to) {
        query.date = {};
        if (from) query.date.$gte = new Date(from);
        if (to)   query.date.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
      }
    }

    const total   = await LedgerEntry.countDocuments(query);
    const entries = await LedgerEntry.find(query)
      .sort({ date: 1, createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // ── Balance summary ────────────────────────────────────
    // Opening balance = account opening balance + all entries BEFORE current page window
    const openingQuery = { companyId: user.companyId, accountId };
    if (fiscalYear) {
      // entries before this fiscal year
      const [startYr] = fiscalYear.split("-");
      openingQuery.date = { $lt: new Date(`${startYr}-04-01`) };
    } else if (from) {
      openingQuery.date = { $lt: new Date(from) };
    }

    const priorAgg = await LedgerEntry.aggregate([
      { $match: openingQuery },
      { $group: { _id: null, totalDebit: { $sum: "$debit" }, totalCredit: { $sum: "$credit" } } },
    ]);

    const prior        = priorAgg[0] || { totalDebit: 0, totalCredit: 0 };
    const openingBal   = (account.openingBalance || 0) + prior.totalDebit - prior.totalCredit;

    // Current window totals
    const windowAgg = await LedgerEntry.aggregate([
      { $match: query },
      { $group: { _id: null, totalDebit: { $sum: "$debit" }, totalCredit: { $sum: "$credit" } } },
    ]);
    const window       = windowAgg[0] || { totalDebit: 0, totalCredit: 0 };
    const closingBal   = openingBal + window.totalDebit - window.totalCredit;

    return NextResponse.json({
      success: true,
      data: {
        account: {
          _id:         account._id,
          name:        account.name,
          type:        account.type,
          group:       account.group,
          balanceType: account.balanceType,
          code:        account.code,
        },
        summary: {
          openingBalance: openingBal,
          totalDebit:     window.totalDebit,
          totalCredit:    window.totalCredit,
          closingBalance: closingBal,
        },
        entries,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err) {
    console.error("GET /api/accounts/ledger error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ─── POST /api/accounts/ledger ────────────────────────────────
// Manually post one or more ledger entries for a transaction.
// Body: { entries: [ { accountId, debit, credit, narration, partyName, partyType }, ... ],
//         transactionId, transactionNumber, transactionType, date }
//
// Validation:
//   • Sum of debits must equal sum of credits (double-entry rule)
//   • Each entry must have either debit > 0 OR credit > 0, not both
export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "Accounts", "create"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { entries, transactionId, transactionNumber, transactionType, date } = body;

    // ── Basic validations ──────────────────────────────────
    if (!transactionId || !date)
      return NextResponse.json({ success: false, message: "transactionId and date are required" }, { status: 400 });

    if (!Array.isArray(entries) || entries.length < 2)
      return NextResponse.json({ success: false, message: "Minimum 2 ledger entries required (double-entry)" }, { status: 400 });

    // Duplicate transaction check
    const existing = await LedgerEntry.findOne({ companyId: user.companyId, transactionId });
    if (existing)
      return NextResponse.json({ success: false, message: "Ledger entries for this transaction already exist" }, { status: 409 });

    // Double-entry balance check
    const totalDebit  = entries.reduce((s, e) => s + (Number(e.debit)  || 0), 0);
    const totalCredit = entries.reduce((s, e) => s + (Number(e.credit) || 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.001)
      return NextResponse.json({
        success: false,
        message: `Debit (${totalDebit}) aur Credit (${totalCredit}) equal hone chahiye`,
      }, { status: 400 });

    // Validate each entry
    for (const e of entries) {
      if (!e.accountId)
        return NextResponse.json({ success: false, message: "Har entry mein accountId hona chahiye" }, { status: 400 });
      if ((e.debit || 0) > 0 && (e.credit || 0) > 0)
        return NextResponse.json({ success: false, message: "Ek entry mein sirf Debit ya sirf Credit hona chahiye, dono nahi" }, { status: 400 });
      if ((e.debit || 0) === 0 && (e.credit || 0) === 0)
        return NextResponse.json({ success: false, message: "Debit ya Credit mein se koi ek value honi chahiye" }, { status: 400 });
    }

    // Resolve account names + calculate running balances
    const accountIds = [...new Set(entries.map(e => e.accountId))];
    const accounts   = await AccountHead.find({ _id: { $in: accountIds }, companyId: user.companyId }).lean();
    const accountMap = Object.fromEntries(accounts.map(a => [a._id.toString(), a]));

    const entryDate   = new Date(date);
    const fiscalYear  = getFiscalYear(entryDate);
    const toInsert    = [];

    for (const e of entries) {
      const account = accountMap[e.accountId];
      if (!account)
        return NextResponse.json({ success: false, message: `Account not found: ${e.accountId}` }, { status: 404 });

      // Get last balance for this account
      const lastEntry = await LedgerEntry.findOne({ companyId: user.companyId, accountId: e.accountId })
        .sort({ date: -1, createdAt: -1 }).lean();

      const prevBalance = lastEntry ? lastEntry.balance : (account.openingBalance || 0);
      const debit       = Number(e.debit)  || 0;
      const credit      = Number(e.credit) || 0;

      // Balance direction: Asset/Expense → Debit increases balance; Liability/Equity/Income → Credit increases
      const newBalance = account.balanceType === "Debit"
        ? prevBalance + debit - credit
        : prevBalance - debit + credit;

      toInsert.push({
        companyId:         user.companyId,
        accountId:         e.accountId,
        accountName:       account.name,
        transactionId,
        transactionNumber: transactionNumber || "",
        transactionType:   transactionType   || "",
        date:              entryDate,
        debit,
        credit,
        balance:           newBalance,
        narration:         e.narration  || "",
        partyName:         e.partyName  || "",
        partyType:         e.partyType  || "",
        fiscalYear,
      });
    }

    const created = await LedgerEntry.insertMany(toInsert);

    return NextResponse.json({ success: true, data: created, count: created.length }, { status: 201 });
  } catch (err) {
    console.error("POST /api/accounts/ledger error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}