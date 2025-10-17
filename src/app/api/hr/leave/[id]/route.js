import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Leave from "@/models/hr/Leave";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

await dbConnect();

/* ---------------- PUT /api/hr/leave/:id ---------------- */
export async function PUT(req, { params }) {
  try {
    const token = getTokenFromHeader(req);
    verifyJWT(token);

    const body = await req.json();
    const leave = await Leave.findByIdAndUpdate(params.id, body, { new: true });
    if (!leave)
      return NextResponse.json({ success: false, message: "Leave not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: leave });
  } catch (err) {
    console.error("PUT Leave error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/* ---------------- DELETE /api/hr/leave/:id ---------------- */
export async function DELETE(req, { params }) {
  try {
    const token = getTokenFromHeader(req);
    verifyJWT(token);

    const leave = await Leave.findByIdAndDelete(params.id);
    if (!leave)
      return NextResponse.json({ success: false, message: "Leave not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Leave deleted" });
  } catch (err) {
    console.error("DELETE Leave error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
