import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import { verifyJWT } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectDB();

    /* ================= AUTH ================= */
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.replace("Bearer ", "")
      : null;

    if (!token) {
      return NextResponse.json(
        { success: false, msg: "Unauthorized" },
        { status: 401 }
      );
    }

    try {
      await verifyJWT(token);
    } catch {
      return NextResponse.json(
        { success: false, msg: "Invalid token" },
        { status: 401 }
      );
    }

    /* ================= FETCH UNASSIGNED ================= */
    const tickets = await Ticket.find({
      $or: [{ agentId: null }, { agentId: { $exists: false } }],
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      tickets,
    });
  } catch (err) {
    console.error("❌ Unassigned tickets error:", err);
    return NextResponse.json(
      { success: false, msg: err.message || "Server Error" },
      { status: 500 }
    );
  }
}
