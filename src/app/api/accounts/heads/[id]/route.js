// 📁 src/app/api/accounts/heads/[id]/route.js

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import AccountHead from "@/models/accounts/AccountHead";

// ─── PUT /api/accounts/heads/:id ──────────────────────────────
export async function PUT(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "Accounts", "edit"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const head = await AccountHead.findOne({ _id: params.id, companyId: user.companyId });
    if (!head) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    const body = await req.json();
    const { name, group, description, code, bankDetails, openingBalance, openingBalanceDate, parentId, isActive } = body;

    // System accounts — name & type cannot be changed
    const update = head.isSystemAccount
      ? { group, description, code, bankDetails, isActive }
      : { name, group, description, code, bankDetails, openingBalance, openingBalanceDate, parentId, isActive };

    const updated = await AccountHead.findByIdAndUpdate(
      params.id, { $set: update }, { new: true }
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("PUT /api/accounts/heads/[id] error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ─── DELETE /api/accounts/heads/:id ──────────────────────────
export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "Accounts", "delete"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const head = await AccountHead.findOne({ _id: params.id, companyId: user.companyId });
    if (!head) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    // System accounts cannot be deleted
    if (head.isSystemAccount)
      return NextResponse.json({ success: false, message: "System accounts cannot be deleted" }, { status: 400 });

    // Soft delete — isActive: false
    await AccountHead.findByIdAndUpdate(params.id, { $set: { isActive: false } });
    return NextResponse.json({ success: true, message: "Account deactivated" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}