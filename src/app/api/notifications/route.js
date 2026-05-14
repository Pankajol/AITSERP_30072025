// app/api/notifications/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Notification from "@/models/Notification";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectDB();

    const user = verifyJWT(getTokenFromHeader(req));

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const notifications = await Notification.find({
      companyId: user.companyId,
      userId: user.id,
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: notifications,
    });

  } catch (err) {
    console.error("GET notifications error:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}