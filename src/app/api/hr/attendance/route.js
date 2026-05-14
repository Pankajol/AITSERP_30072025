import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import Attendance from "@/models/hr/Attendance";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "attendance", "read"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const date       = searchParams.get("date");
    const month      = searchParams.get("month");
    const employeeId = searchParams.get("employeeId");

    const query = { companyId: user.companyId };
    if (date)       query.date = date;
    if (month)      query.date = { $regex: `^${month}` };
    if (employeeId) query.employeeId = employeeId;

    const records = await Attendance.find(query)
      .populate("employeeId", "fullName employeeCode")
      .sort({ date: -1 });

    return NextResponse.json({ success: true, data: records });
  } catch (err) {
    console.error("GET /api/hr/attendance error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "attendance", "create"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const body   = await req.json();
    const record = await Attendance.create({ ...body, companyId: user.companyId });
    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (err) {
    console.error("POST /api/hr/attendance error:", err);
    // Duplicate key = already punched
    if (err.code === 11000)
      return NextResponse.json({ success: false, message: "Attendance already marked for this date" }, { status: 409 });
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}