import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Leave from "@/models/hr/Leave";
import { withAuth, hasRole } from "@/lib/rbac";

export async function GET(req) {
  const auth = await withAuth(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { user } = auth;

  await connectDB();

  const leaves = await Leave.find({
    companyId: user.companyId,
    employeeId: user.id,
  }).sort({ createdAt: -1 });

  return NextResponse.json({ data: leaves });
}
