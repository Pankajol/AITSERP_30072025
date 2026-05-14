// app/api/notifications/create/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Notification from "@/models/Notification";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function POST(req) {
  try {
    await connectDB();

    const user = verifyJWT(getTokenFromHeader(req));

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const notification = await Notification.create({
      companyId: user.companyId,
      userId: body.userId,
      title: body.title,
      message: body.message,
      type: body.type || "system",
    });

    return NextResponse.json({
      success: true,
      data: notification,
    });

  } catch (err) {
    console.error("CREATE notification error:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}