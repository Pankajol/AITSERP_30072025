import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import CompanyUser from "@/models/CompanyUser";
import Customer from "@/models/CustomerModel";
import Message from "@/models/helpdesk/Message";

import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const DEFAULT_AVATAR = "/mnt/data/c4bfcf65-19f2-400e-a777-0771674c53c6.png";

export async function GET(req, { params }) {
  try {
    await connectDB();

    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });

    let payload;
    try {
      payload = await verifyJWT(token);
    } catch (e) {
      return NextResponse.json({ success: false, msg: "Invalid token" }, { status: 401 });
    }

    const id = params?.id;
    if (!id)
      return NextResponse.json({ success: false, msg: "Ticket id missing" }, { status: 400 });

    const ticket = await Ticket.findById(id)
      .populate("customerId", "customerName emailId avatar")
      .populate("agentId", "name email avatar")
      .populate("messages.sender", "name email avatar")
      .lean();

    if (!ticket)
      return NextResponse.json({ success: false, msg: "Ticket not found" }, { status: 404 });

    // fallback avatar
    if (ticket.customerId && !ticket.customerId.avatar)
      ticket.customerId.avatar = DEFAULT_AVATAR;

    if (ticket.agentId && !ticket.agentId.avatar)
      ticket.agentId.avatar = DEFAULT_AVATAR;

    if (ticket.messages?.length) {
      ticket.messages = ticket.messages.map(m => {
        if (m.sender && !m.sender.avatar) m.sender.avatar = DEFAULT_AVATAR;
        return m;
      });
    }

    return NextResponse.json({ success: true, ticket });
  } catch (err) {
    console.error("GET /tickets/[id] error:", err);
    return NextResponse.json(
      { success: false, msg: err.message || "Server error" },
      { status: 500 }
    );
  }
}
