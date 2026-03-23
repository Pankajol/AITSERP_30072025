import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import Holiday from "@/models/hr/Holiday";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") || new Date().getFullYear().toString();

    const holidays = await Holiday.find({
      companyId: user.companyId,
      date: { $regex: `^${year}` },
    }).sort({ date: 1 });

    return NextResponse.json({ success: true, data: holidays });
  } catch (err) {
    console.error("GET /api/hr/holidays error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "holidays", "create"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const holiday = await Holiday.create({ ...body, companyId: user.companyId });
    return NextResponse.json({ success: true, data: holiday }, { status: 201 });
  } catch (err) {
    console.error("POST /api/hr/holidays error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}