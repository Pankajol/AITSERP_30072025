import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { hasRole, withAuth } from "@/lib/rbac";
import Employee from "@/models/hr/Employee";
import { Parser } from "json2csv";

export async function GET(req) {
  const auth = await hasRole(req, ["Admin", "HR"]);
  if (auth.error)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { user } = auth;

  const employees = await Employee.find({ companyId: user.companyId })
    .populate("department", "name")
    .populate("designation", "title");

  const data = employees.map((e) => ({
    Name: e.fullName,
    Email: e.email,
    Phone: e.phone,
    Department: e.department?.name,
    Designation: e.designation?.title,
    Type: e.employmentType,
    Status: e.status,
  }));

  const parser = new Parser();
  const csv = parser.parse(data);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=employees.csv",
    },
  });
}
