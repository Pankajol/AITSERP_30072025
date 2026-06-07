import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Notice from "@/models/society/Notice";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function POST(req) {
  await dbConnect();
  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const user = await verifyJWT(token);
  if (!user) return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });

  const { noticeId } = await req.json();
  if (!noticeId) return NextResponse.json({ success: false, message: "Notice ID required" }, { status: 400 });

  const notice = await Notice.findOne({ _id: noticeId, companyId: user.companyId });
  if (!notice) return NextResponse.json({ success: false, message: "Notice not found" }, { status: 404 });

  if (!notice.readBy.includes(user.id)) {
    notice.readBy.push(user.id);
    await notice.save();
  }
  return NextResponse.json({ success: true, message: "Marked as read" });
}