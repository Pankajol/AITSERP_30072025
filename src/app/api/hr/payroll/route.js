import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { verifyJWT, getTokenFromHeader } from "@/lib/auth";
import Payroll from "@/models/hr/Payroll";

export async function GET(req) {
  await connectDB();
  const user = verifyJWT(getTokenFromHeader(req));

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");

  const records = await Payroll.find({ companyId: user.companyId, month })
    .populate("employeeId", "fullName employeeCode");

  const formatted = records.map((r) => ({
    ...r.toObject(),
    employee: r.employeeId,
  }));

  return NextResponse.json({ data: formatted });
}
