// app/api/notifications/[id]/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Notification from "@/models/Notification";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function PATCH(req, { params }) {
  try {
    await connectDB();

    const user = verifyJWT(getTokenFromHeader(req));

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: params.id,
        companyId: user.companyId,
      },
      { isRead: true },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      data: notification,
    });

  } catch (err) {
    console.error("UPDATE notification error:", err);
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}