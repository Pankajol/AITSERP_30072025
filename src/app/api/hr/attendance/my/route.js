import Attendance from "@/models/hr/Attendance";
import { withAuth } from "@/lib/rbac";
import connectDB from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req) {
  await connectDB();

  const auth = await withAuth(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { user } = auth;

  const data = await Attendance.find({
    employeeId: user.id,
    companyId: user.companyId,
  }).sort({ date: -1 });

  return NextResponse.json({ data });
}
