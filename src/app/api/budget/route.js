import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Budget from "@/models/Budget";
import AccountHead from "@/models/accounts/AccountHead";
import LedgerEntry from "@/models/accounts/LedgerEntry";

// GET budgets for a fiscal year
export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const fiscalYear = searchParams.get("fiscalYear");
    const type = searchParams.get("type"); // Income / Expense

    const query = { companyId: user.companyId };
    if (fiscalYear) query.fiscalYear = fiscalYear;
    if (type) query.type = type;

    const budgets = await Budget.find(query).populate("accountId", "name code type");
    return NextResponse.json({ success: true, data: budgets });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST create/update budget
export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { accountId, fiscalYear, amount, type, monthWise } = body;

    if (!accountId || !fiscalYear || !amount) {
      return NextResponse.json({ success: false, message: "accountId, fiscalYear, amount required" }, { status: 400 });
    }

    const budget = await Budget.findOneAndUpdate(
      { companyId: user.companyId, accountId, fiscalYear },
      { companyId: user.companyId, accountId, fiscalYear, amount, type, monthWise: monthWise || [] },
      { upsert: true, new: true }
    );
    return NextResponse.json({ success: true, data: budget });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}