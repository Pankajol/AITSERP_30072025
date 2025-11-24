// app/api/helpdesk/assign/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import CompanyUser from "@/models/CompanyUser"; // your agent/customer model
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function POST(req) {
  try {
    await connectDB();

    // auth
    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });

    try {
      await verifyJWT(token);
    } catch (err) {
      return NextResponse.json({ success: false, msg: "Invalid token" }, { status: 401 });
    }

    const body = await req.json();
    const ticketId = body.ticketId;
    const agentId = body.agentId;
    const priority = body.priority;

    if (!ticketId) return NextResponse.json({ success: false, msg: "ticketId required" }, { status: 400 });
    if (!agentId) return NextResponse.json({ success: false, msg: "agentId required" }, { status: 400 });

    const agent = await CompanyUser.findById(agentId);
    if (!agent) return NextResponse.json({ success: false, msg: "Agent not found" }, { status: 404 });

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return NextResponse.json({ success: false, msg: "Ticket not found" }, { status: 404 });

    // already assigned?
    if (ticket.agentId) {
      if (ticket.agentId.toString() === agentId)
        return NextResponse.json({ success: true, msg: "Already assigned", ticket });

      return NextResponse.json(
        { success: false, msg: "Ticket already assigned to another agent" },
        { status: 409 }
      );
    }

    // assign
    ticket.agentId = agentId;

    if (priority) ticket.priority = priority;

    // simple SLA logic
    const now = new Date();
    const prio = (ticket.priority || "normal").toLowerCase();
    let hrs = 24;
    if (prio === "low") hrs = 48;
    if (prio === "high") hrs = 8;
    if (prio === "critical") hrs = 1;
    ticket.slaDue = new Date(now.getTime() + hrs * 60 * 60 * 1000);

    await ticket.save();

    const updated = await Ticket.findById(ticketId).populate("agentId", "name email avatar");

    return NextResponse.json({ success: true, msg: "Ticket assigned", ticket: updated });
  } catch (err) {
    console.error("assign error:", err);
    return NextResponse.json({ success: false, msg: err.message }, { status: 500 });
  }
}
