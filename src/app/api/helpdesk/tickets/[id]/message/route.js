// app/api/helpdesk/tickets/[id]/message/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const SAMPLE_AVATAR = "/mnt/data/c4bfcf65-19f2-400e-a777-0771674c53c6.png";

export async function POST(req, { params }) {
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

    const senderId = userPayload?.id || userPayload?._id;
    if (!senderId) return NextResponse.json({ success: false, msg: "Invalid user in token" }, { status: 401 });

    // Validate params & body
    const ticketId = params?.id;
    if (!ticketId) return NextResponse.json({ success: false, msg: "Ticket id missing" }, { status: 400 });

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, msg: "Invalid JSON body" }, { status: 400 });
    }

    const text = (body?.message || "").trim();
    if (!text) return NextResponse.json({ success: false, msg: "Message is required" }, { status: 400 });

    // Find ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return NextResponse.json({ success: false, msg: "Ticket not found" }, { status: 404 });

    // Append message
    ticket.messages.push({ sender: senderId, message: text, aiSuggested: false });

    // If sender is an agent, set ticket status/agent
    const senderUser = await CompanyUser.findById(senderId).lean();
    if (senderUser?.roles?.includes("agent")) {
      // set in-progress if it was open
      ticket.status = ticket.status === "open" ? "in-progress" : ticket.status;
      // set agentId if not already set
      ticket.agentId = ticket.agentId || senderId;
    }

    await ticket.save();

    // Populate to return a friendly object
    const populated = await Ticket.findById(ticketId)
      .populate("messages.sender", "name email avatar")
      .populate("customerId", "name email avatar")
      .populate("agentId", "name email avatar")
      .lean();

    // ensure every message sender has an avatar (fallback)
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
    console.error("POST /api/helpdesk/tickets/[id]/message error:", err);
    return NextResponse.json({ success: false, msg: err?.message || "Server error" }, { status: 500 });
  }
}
export async function GET(req, { params }) {
  try {
    await connectDB();
    // ---- auth check ----
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, msg: "Unauthorized: token missing" }, { status: 401 });
    }   
    try {
      // verifyJWT should throw on invalid token
      await verifyJWT(token);
    } catch (err) {
      return NextResponse.json({ success: false, msg: "Unauthorized: invalid token" }, { status: 401 });
    }       
    // ---- validate params ----
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ success: false, msg: "Ticket ID missing" }, { status: 400 });
    }
    // ---- fetch ticket ----
    const ticket = await Ticket.findById(id)
      .populate("messages.sender", "name email avatar")
      .populate("customerId", "name email avatar")
      .populate("agentId", "name email avatar");
    if (!ticket) {
      return NextResponse.json({ success: false, msg: "Ticket not found" }, { status: 404 });
    }
    // include sample avatar path so client can use it as fallback
    return NextResponse.json({
      success: true,
      ticket,
      sampleAvatarUrl: SAMPLE_AVATAR,
    });
  } catch (err) {
    console.error("GET /api/helpdesk/tickets/[id]/message error:", err);
    return NextResponse.json({ success: false, msg: err?.message || "Server error" }, { status: 500 });
  } 
}
