import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { hasRole, withAuth} from "@/lib/rbac";

import Payroll from "@/models/hr/Payroll";
import Employee from "@/models/hr/Employee";

export async function GET(req, { params }) {
  const auth = await hasRole(req, ["Admin", "HR", "Employee"]);

  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { user } = auth;
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");

  await connectDB();

  const employeeId = params.id;

  // Employee can only see his own payslip
  if (user.role === "Employee" && user.id !== employeeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const payroll = await Payroll.findOne({
    employeeId,
    month,
    companyId: user.companyId,
  });

  const employee = await Employee.findById(employeeId).populate(
    "department designation"
  );

  if (!payroll || !employee) {
    return NextResponse.json({ error: "Data not found" }, { status: 404 });
  }

  return NextResponse.json({
    employee,
    payroll,
    month,
  });
}
