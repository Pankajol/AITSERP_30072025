import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Notification from "@/models/election/Notification";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

async function getUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  const user = await verifyJWT(token);
  if (!user) return { error: "Invalid token", status: 401 };
  return { user };
}

export async function GET(req) {
  try {
    const { user, error, status } = await getUser(req);
    if (error) return NextResponse.json({ success: false, message: error }, { status });

    await dbConnect();
    const notifications = await Notification.find({ 
      userId: user.id, 
      read: false 
    }).sort({ createdAt: -1 }).limit(20);
    
    return NextResponse.json({ success: true, data: notifications });
  } catch (err) {
    console.error("Notifications GET error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { user, error, status } = await getUser(req);
    if (error) return NextResponse.json({ success: false, message: error }, { status });

    await dbConnect();
    const { notificationId } = await req.json();
    if (!notificationId) {
      return NextResponse.json({ success: false, message: "notificationId required" }, { status: 400 });
    }

    const updated = await Notification.findOneAndUpdate(
      { _id: notificationId, userId: user.id },
      { read: true },
      { new: true }
    );
    if (!updated) {
      return NextResponse.json({ success: false, message: "Notification not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Notifications PUT error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}