// app/api/helpdesk/tickets/unassigned/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import { verifyJWT } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectDB();

    // AUTH CHECK
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : null;

    if (!token) {
      return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });
    }

    // Validate token
    try {
      await verifyJWT(token);
    } catch (e) {
      return NextResponse.json({ success: false, msg: "Invalid token" }, { status: 401 });
    }

    // Fetch unassigned tickets
    const tickets = await Ticket.find({
      $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }]
    })
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      tickets,
    });
  } catch (err) {
    console.error("unassigned tickets error:", err);
    return NextResponse.json(
      { success: false, msg: err.message || "Server Error" },
      { status: 500 }
    );
  }
}
