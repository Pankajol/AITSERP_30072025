import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import LeaveBalance from "@/models/hr/LeaveBalance";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    let balance = await LeaveBalance.findOne({
      employeeId: params.employeeId,
      companyId:  user.companyId,
    });

    // Auto-create with defaults if none exists
    if (!balance) {
      balance = await LeaveBalance.create({
        employeeId: params.employeeId,
        companyId:  user.companyId,
      });
    }

    return NextResponse.json({ success: true, data: balance });
  } catch (err) {
    console.error("GET /api/hr/leave-balance/[employeeId] error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const body    = await req.json();
    const balance = await LeaveBalance.findOneAndUpdate(
      { employeeId: params.employeeId, companyId: user.companyId },
      body,
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: balance });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}