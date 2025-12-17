// app/api/helpdesk/tickets/[id]/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    await connectDB();

    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });
    }

    verifyJWT(token); // throws if invalid

    const ticketId = await params.id;
    if (!ticketId) {
      return NextResponse.json({ success: false, msg: "Ticket id missing" }, { status: 400 });
    }

    const ticket = await Ticket.findById(ticketId)
      .populate("customerId", "name email")
      .populate("agentId", "name email avatar")
      .populate("messages.sender", "name email avatar")
      .lean();

    if (!ticket) {
      return NextResponse.json({ success: false, msg: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, ticket });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, msg: err.message },
      { status: 500 }
    );
  }
}
