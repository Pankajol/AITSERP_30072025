import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Notification from "@/models/project/NotificationModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// Get all notifications for logged-in user
export async function GET(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const notifications = await Notification.find({ user: decoded.userId })
      .sort({ createdAt: -1 })
      .populate("task", "title status")
      .populate("project", "name");

    return NextResponse.json(notifications, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// Mark ALL as read
export async function PUT(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    await Notification.updateMany(
      { user: decoded.userId, read: false },
      { $set: { read: true } }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// Create new notification
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
