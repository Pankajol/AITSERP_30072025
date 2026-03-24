// 📁 src/app/api/accounts/heads/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import AccountHead from "@/models/accounts/AccountHead";

// ─── Default account heads auto-create on first call ─────────
const DEFAULT_HEADS = [
  { name: "Cash in Hand",        type: "Asset",     group: "Current Asset",    balanceType: "Debit",  isSystemAccount: true },
  { name: "Bank Account",        type: "Asset",     group: "Current Asset",    balanceType: "Debit",  isSystemAccount: true },
  { name: "Accounts Receivable", type: "Asset",     group: "Current Asset",    balanceType: "Debit",  isSystemAccount: true },
  { name: "Inventory / Stock",   type: "Asset",     group: "Current Asset",    balanceType: "Debit",  isSystemAccount: false },
  { name: "Fixed Assets",        type: "Asset",     group: "Fixed Asset",      balanceType: "Debit",  isSystemAccount: false },
  { name: "Accounts Payable",    type: "Liability", group: "Current Liability",balanceType: "Credit", isSystemAccount: true },
  { name: "GST Payable",         type: "Liability", group: "Current Liability",balanceType: "Credit", isSystemAccount: false },
  { name: "TDS Payable",         type: "Liability", group: "Current Liability",balanceType: "Credit", isSystemAccount: false },
  { name: "Owner Capital",       type: "Equity",    group: "Capital",          balanceType: "Credit", isSystemAccount: true },
  { name: "Retained Earnings",   type: "Equity",    group: "Reserve",          balanceType: "Credit", isSystemAccount: true },
  { name: "Sales Revenue",       type: "Income",    group: "Direct Income",    balanceType: "Credit", isSystemAccount: true },
  { name: "Service Revenue",     type: "Income",    group: "Direct Income",    balanceType: "Credit", isSystemAccount: false },
  { name: "Other Income",        type: "Income",    group: "Indirect Income",  balanceType: "Credit", isSystemAccount: false },
  { name: "Purchase",            type: "Expense",   group: "Direct Expense",   balanceType: "Debit",  isSystemAccount: true },
  { name: "Salary Expense",      type: "Expense",   group: "Indirect Expense", balanceType: "Debit",  isSystemAccount: true },
  { name: "Rent Expense",        type: "Expense",   group: "Indirect Expense", balanceType: "Debit",  isSystemAccount: false },
  { name: "Utilities Expense",   type: "Expense",   group: "Indirect Expense", balanceType: "Debit",  isSystemAccount: false },
  { name: "Marketing Expense",   type: "Expense",   group: "Indirect Expense", balanceType: "Debit",  isSystemAccount: false },
];

// ─── GET /api/accounts/heads ──────────────────────────────────
export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type   = searchParams.get("type");
    const group  = searchParams.get("group");
    const search = searchParams.get("search");
    const init   = searchParams.get("init");

    const query = { companyId: user.companyId, isActive: true };
    if (type)   query.type  = type;
    if (group)  query.group = group;
    if (search) query.name  = { $regex: search, $options: "i" };

    let heads = await AccountHead.find(query)
      .populate("parentId", "name type")
      .sort({ type: 1, group: 1, name: 1 });

    if (init === "true" || heads.length === 0) {
      const existing = await AccountHead.countDocuments({ companyId: user.companyId });
      if (existing === 0) {
        await AccountHead.insertMany(
          DEFAULT_HEADS.map(h => ({ ...h, companyId: user.companyId }))
        );
        heads = await AccountHead.find({ companyId: user.companyId, isActive: true })
          .sort({ type: 1, group: 1, name: 1 });
      }
    }

    const grouped = heads.reduce((acc, h) => {
      if (!acc[h.type]) acc[h.type] = [];
      acc[h.type].push(h);
      return acc;
    }, {});

    return NextResponse.json({ success: true, data: heads, grouped });
  } catch (err) {
    console.error("GET /api/accounts/heads error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ─── POST /api/accounts/heads ─────────────────────────────────
export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "Accounts", "create"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { name, type, group, balanceType, parentId, openingBalance, openingBalanceDate, bankDetails, description, code } = body;

    if (!name || !type || !balanceType)
      return NextResponse.json({ success: false, message: "name, type, balanceType are required" }, { status: 400 });

    // ✅ FIX 1: Explicit duplicate name check (case-insensitive)
    const nameDuplicate = await AccountHead.findOne({
      companyId: user.companyId,
      name: { $regex: `^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      isActive: true,
    });
    if (nameDuplicate)
      return NextResponse.json({
        success: false,
        message: `"${name.trim()}" naam ka account pehle se exist karta hai`,
      }, { status: 409 });

    // ✅ FIX 2: Code duplicate check — only if code is non-empty
    const trimmedCode = code?.trim() || "";
    if (trimmedCode) {
      const codeDuplicate = await AccountHead.findOne({
        companyId: user.companyId,
        code: trimmedCode,
        isActive: true,
      });
      if (codeDuplicate)
        return NextResponse.json({
          success: false,
          message: `Code "${trimmedCode}" pehle se use ho raha hai`,
        }, { status: 409 });
    }

    const head = await AccountHead.create({
      companyId:          user.companyId,
      name:               name.trim(),
      type,
      group,
      balanceType,
      parentId:           parentId           || null,
      openingBalance:     openingBalance      || 0,
      openingBalanceDate: openingBalanceDate  || null,
      bankDetails:        bankDetails         || {},
      description:        description?.trim() || "",
      // ✅ FIX 3: null store karo "" ki jagah — sparse index conflict nahi hoga
      code:               trimmedCode         || null,
    });

    return NextResponse.json({ success: true, data: head }, { status: 201 });
  } catch (err) {
    // ✅ FIX 4: Fallback for any 11000 that slips through pre-checks
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[1] || "";
      const msg =
        field === "name" ? "Is naam ka account pehle se exist karta hai" :
        field === "code" ? "Yeh account code pehle se use ho raha hai" :
                           "Duplicate entry — account already exists";
      return NextResponse.json({ success: false, message: msg }, { status: 409 });
    }
    console.error("POST /api/accounts/heads error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}