import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import LeaveBalance from "@/models/hr/LeaveBalance";
import { withAuth, hasRole } from "@/lib/rbac";

export async function GET(req) {
  const auth = await withAuth(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { user } = auth;
  await connectDB();

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");

  // Employee → only self
  // HR / Admin / Manager → can pass employeeId
  const targetEmployeeId =
    hasRole(user, ["Admin", "HR", "Manager"]) && employeeId
      ? employeeId
      : user.id;

  let balance = await LeaveBalance.findOne({
    companyId: user.companyId,
    employeeId: targetEmployeeId,
  });

  if (!balance) {
    balance = await LeaveBalance.create({
      companyId: user.companyId,
      employeeId: targetEmployeeId,
    });
  }

  return NextResponse.json({ data: balance });
}
