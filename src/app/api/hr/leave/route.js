import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import companyUser from "@/models/CompanyUser";
import Leave from "@/models/hr/Leave";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

await dbConnect();

/* ---------------- GET /api/hr/leave ---------------- */

export async function GET(req) {
  try {
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

   const leaves = await Leave.find({ companyId: decoded.companyId })
  .populate("employee", "name");
    return NextResponse.json({ success: true, data: leaves });
  } catch (err) {
    console.error("GET Leave error:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/* ---------------- POST /api/hr/leave ---------------- */
export async function POST(req) {
  try {
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);
    const body = await req.json();

    const leave = await Leave.create({
      ...body,
      companyId: decoded.companyId,
      createdBy: decoded.id,
    });

    return NextResponse.json({ success: true, data: leave });
  } catch (err) {
    console.error("POST Leave error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
