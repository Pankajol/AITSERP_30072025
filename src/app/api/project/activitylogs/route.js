import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ActivityLog from "@/models/project/ActivityLogModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const logs = await ActivityLog.find({ company: decoded.company })
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json(logs, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const body = await req.json();

    const log = new ActivityLog({
      ...body,
      user: decoded.userId,
      company: decoded.company,
    });
    await log.save();

    return NextResponse.json(log, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
