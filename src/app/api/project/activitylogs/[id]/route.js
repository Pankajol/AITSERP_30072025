import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ActivityLog from "@/models/project/ActivityLogModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const log = await ActivityLog.findOne({
      _id: params.id,
      company: decoded.company,
    }).populate("user", "name email");

    if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(log);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const deleted = await ActivityLog.findOneAndDelete({
      _id: params.id,
      company: decoded.company,
    });

    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
