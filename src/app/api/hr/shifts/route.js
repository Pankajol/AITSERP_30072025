import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import Shift from "@/models/hr/Shift";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const shifts = await Shift.find({ companyId: user.companyId }).sort({ name: 1 });
    return NextResponse.json({ success: true, data: shifts });
  } catch (err) {
    console.error("GET /api/hr/shifts error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "shifts", "create"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const body  = await req.json();
    const shift = await Shift.create({ ...body, companyId: user.companyId });
    return NextResponse.json({ success: true, data: shift }, { status: 201 });
  } catch (err) {
    console.error("POST /api/hr/shifts error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}