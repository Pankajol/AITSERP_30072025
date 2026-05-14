import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import Designation from "@/models/hr/Designation";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const designations = await Designation.find({ companyId: user.companyId }).sort({ level: 1 });
    return NextResponse.json({ success: true, data: designations });
  } catch (err) {
    console.error("GET /api/hr/designations error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "designations", "create"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const body        = await req.json();
    const designation = await Designation.create({ ...body, companyId: user.companyId });
    return NextResponse.json({ success: true, data: designation }, { status: 201 });
  } catch (err) {
    console.error("POST /api/hr/designations error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}