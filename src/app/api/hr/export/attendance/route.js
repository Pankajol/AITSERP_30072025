import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { withAuth, hasRole } from "@/lib/rbac";
import Attendance from "@/models/hr/Attendance";
import { Parser } from "json2csv";

export async function GET(req) {
  const auth = await hasRole(req, ["Admin", "HR"]);
  if (auth.error)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { user } = auth;

  const data = await Attendance.find({ companyId: user.companyId })
    .populate("employeeId", "fullName");

  const formatted = data.map((a) => ({
    Employee: a.employeeId?.fullName,
    Date: a.date,
    PunchIn: a.punchIn?.time,
    PunchOut: a.punchOut?.time,
    Hours: a.totalHours,
    Status: a.status,
  }));

  const parser = new Parser();
  const csv = parser.parse(formatted);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=attendance.csv",
    },
  });
}
