import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { verifyJWT, getTokenFromHeader } from "@/lib/auth";
import Attendance from "@/models/hr/Attendance";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));

    const today = new Date().toISOString().slice(0, 10);

    const data = await Attendance.find({ companyId: user.companyId, date: today })
      .populate("employeeId", "fullName");

    const formatted = data.map((a) => ({
      ...a.toObject(),
      employeeName: a.employeeId?.fullName,
    }));

    return NextResponse.json({ data: formatted });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
