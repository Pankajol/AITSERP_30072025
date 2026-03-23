import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Employee from "@/models/hr/Employee";
import Leave from "@/models/hr/Leave";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

/* =========================
   GET → All Leaves (Admin)
========================= */
export async function GET(req) {
  try {
    await connectDB();

    const user = verifyJWT(getTokenFromHeader(req));

    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // 🔐 permission check
    if (!hasPermission(user, "leaves", "view")) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const leaves = await Leave.find({ companyId: user.companyId })
      .populate("employeeId", "fullName email")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: leaves });

  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}