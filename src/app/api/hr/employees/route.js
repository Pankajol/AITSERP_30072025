import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Department from "@/models/hr/Department";
import Designation from "@/models/hr/Designation";

import Employee from "@/models/hr/Employee";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));

    const employees = await Employee.find({ companyId: user.companyId })
      .populate("department", "name")
      .populate("designation", "title")
      .sort({ createdAt: -1 });

    return NextResponse.json({ data: employees });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    const body = await req.json();

    const count = await Employee.countDocuments({ companyId: user.companyId });

    const employee = await Employee.create({
      companyId: user.companyId,
      employeeCode: `EMP-${count + 1}`,
      ...body,
    });

    return NextResponse.json({ data: employee });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
