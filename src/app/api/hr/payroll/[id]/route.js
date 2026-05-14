// 📁 src/app/api/hr/payroll/[id]/route.js

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import Payroll from "@/models/hr/Payroll";

// ─── PUT /api/hr/payroll/:id ──────────────────────────────────
export async function PUT(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "payroll", "edit"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { basic, hra, allowances, deductions, netSalary } = body;

    const payroll = await Payroll.findOneAndUpdate(
      { _id: params.id, companyId: user.companyId },
      {
        $set: {
          basic:      Number(basic      || 0),
          hra:        Number(hra        || 0),
          allowances: Number(allowances || 0),
          deductions: Number(deductions || 0),
          netSalary:  Number(netSalary  || 0),
        }
      },
      { new: true }
    );

    if (!payroll)
      return NextResponse.json({ success: false, message: "Payroll not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: payroll });
  } catch (err) {
    console.error("PUT /api/hr/payroll/[id] error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ─── DELETE /api/hr/payroll/:id ───────────────────────────────
export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "payroll", "delete"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    await Payroll.findOneAndDelete({ _id: params.id, companyId: user.companyId });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}