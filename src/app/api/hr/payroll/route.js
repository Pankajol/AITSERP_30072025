// 📁 src/app/api/hr/payroll/route.js

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import Payroll from "@/models/hr/Payroll";

// ─── GET /api/hr/payroll?month=YYYY-MM ───────────────────────
export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "payroll", "view"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // "YYYY-MM"

    const query = { companyId: user.companyId };
    if (month) query.month = month;

    const payrolls = await Payroll.find(query)
      .populate("employeeId", "fullName email employeeCode")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: payrolls });
  } catch (err) {
    console.error("GET /api/hr/payroll error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ─── POST /api/hr/payroll ─────────────────────────────────────
export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "payroll", "create"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { employeeId, month, basic, hra, allowances, deductions, netSalary } = body;

    if (!employeeId || !month)
      return NextResponse.json({ success: false, message: "employeeId and month are required" }, { status: 400 });

    // Duplicate check — ek employee ek month mein ek hi payroll
    const existing = await Payroll.findOne({ employeeId, month, companyId: user.companyId });
    if (existing)
      return NextResponse.json({ success: false, message: "Payroll already exists for this employee and month" }, { status: 409 });

    const payroll = await Payroll.create({
      companyId: user.companyId,
      employeeId, month,
      basic:      Number(basic      || 0),
      hra:        Number(hra        || 0),
      allowances: Number(allowances || 0),
      deductions: Number(deductions || 0),
      netSalary:  Number(netSalary  || 0),
    });

    return NextResponse.json({ success: true, data: payroll }, { status: 201 });
  } catch (err) {
    console.error("POST /api/hr/payroll error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}