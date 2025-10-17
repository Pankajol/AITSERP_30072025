import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Downtime from "@/models/ppc/downtimeModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

await dbConnect();

/* ---------------- GET /api/downtime ---------------- */
export async function GET() {
  try {
    const downtimes = await Downtime.find()
      .populate("machine operator")
      .sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: downtimes });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/* ---------------- POST /api/downtime ---------------- */
export async function POST(req) {
  try {
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);
    if (!decoded) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const downtime = await Downtime.create({ ...body, companyId: decoded.companyId });
    return NextResponse.json({ success: true, data: downtime });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
