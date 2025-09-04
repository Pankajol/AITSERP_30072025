import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Notification from "@/models/project/NotificationModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const notifications = await Notification.find({ user: decoded.userId })
      .sort({ createdAt: -1 });

    return NextResponse.json(notifications, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();

    const notification = new Notification(body);
    await notification.save();

    return NextResponse.json(notification, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
