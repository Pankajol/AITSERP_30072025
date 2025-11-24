// app/api/helpdesk/update-status/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const SAMPLE_AVATAR = "/mnt/data/c4bfcf65-19f2-400e-a777-0771674c53c6.png";

export async function POST(req) {
  try {
    await connectDB();

    // Auth
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });

    let userPayload;
    try {
      userPayload = await verifyJWT(token);
    } catch (err) {
      return NextResponse.json({ success: false, msg: "Invalid token" }, { status: 401 });
    }

    // parse body
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, msg: "Invalid JSON body" }, { status: 400 });
    }

    const ticketId = body?.ticketId;
    const status = (body?.status || "").toString().trim();
    if (!ticketId || !status) return NextResponse.json({ success: false, msg: "ticketId and status are required" }, { status: 400 });

    // optional: enforce role checks
    // const roles = userPayload?.roles || [];
    // if (!roles.includes("agent") && !roles.includes("admin")) {
    //   return NextResponse.json({ success:false, msg:"Forbidden" }, { status:403 });
    // }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return NextResponse.json({ success: false, msg: "Ticket not found" }, { status: 404 });

    ticket.status = status;
    if (status === "closed") {
      ticket.closedAt = new Date();
    } else {
      ticket.closedAt = undefined;
    }

    await ticket.save();

    // return populated ticket
    const populated = await Ticket.findById(ticketId)
      .populate("messages.sender", "name email avatar")
      .populate("customerId", "name email avatar")
      .populate("agentId", "name email avatar")
      .lean();

    // populate fallback avatars
    if (populated?.messages?.length) {
      populated.messages = populated.messages.map((m) => {
        if (!m.sender) return m;
        if (!m.sender.avatar) m.sender.avatar = SAMPLE_AVATAR;
        return m;
      });
    }
    if (populated?.customerId && !populated.customerId.avatar) populated.customerId.avatar = SAMPLE_AVATAR;
    if (populated?.agentId && !populated.agentId.avatar) populated.agentId.avatar = SAMPLE_AVATAR;

    return NextResponse.json({ success: true, ticket: populated, sampleAvatarUrl: SAMPLE_AVATAR });
  } catch (err) {
    console.error("POST /api/helpdesk/update-status error:", err);
    return NextResponse.json({ success: false, msg: err?.message || "Server error" }, { status: 500 });
  }
}
