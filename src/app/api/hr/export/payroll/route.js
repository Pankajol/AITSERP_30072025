import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { hasRole, withAuth} from "@/lib/rbac";
import Payroll from "@/models/hr/Payroll";
import { Parser } from "json2csv";

export async function GET(req) {
  const auth = await hasRole(req, ["Admin", "HR"]);
  if (auth.error)
    return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { user } = auth;

  const payrolls = await Payroll.find({ companyId: user.companyId })
    .populate("employeeId", "fullName");

  const data = payrolls.map((p) => ({
    Employee: p.employeeId?.fullName,
    Month: p.month,
    Basic: p.basic,
    HRA: p.hra,
    Allowances: p.allowances,
    Deductions: p.deductions,
    NetSalary: p.netSalary,
    Status: p.paidStatus,
  }));

  const parser = new Parser();
  const csv = parser.parse(data);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=payroll.csv",
    },
  });
}
