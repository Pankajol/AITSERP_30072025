import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import mongoose from "mongoose";

export async function POST(req) {
  try {
    await dbConnect();

    /* ================= AUTH ================= */
    const token = getTokenFromHeader(req);

    if (!token)
      return NextResponse.json(
        { success: false, msg: "Unauthorized" },
        { status: 401 }
      );

    let user;
    try {
      user = await verifyJWT(token);
    } catch {
      return NextResponse.json(
        { success: false, msg: "Invalid token" },
        { status: 403 }
      );
    }

    const { ticketId, message } = await req.json();

    if (!ticketId || !mongoose.Types.ObjectId.isValid(ticketId)) {
      return NextResponse.json(
        { success: false, msg: "Invalid ticketId" },
        { status: 400 }
      );
    }

    if (!message?.trim()) {
      return NextResponse.json(
        { success: false, msg: "Message required" },
        { status: 400 }
      );
    }

    const ticket = await Ticket.findById(ticketId);

    if (!ticket)
      return NextResponse.json(
        { success: false, msg: "Ticket not found" },
        { status: 404 }
      );

    /* ================= PERMISSION ================= */

    const roles =
      user.roles?.map((r) => r.toLowerCase()) || [];

    const isCompany = user.type === "company";
    const isCustomer = user.type === "customer";
    const isAgent = roles.includes("agent");

    const canReply =
      isCompany ||
      (isCustomer && ticket.customerId.toString() === user.id) ||
      (isAgent && ticket.agentId?.toString() === user.id);

    if (!canReply)
      return NextResponse.json(
        { success: false, msg: "Forbidden" },
        { status: 403 }
      );

    /* ================= SENDER TYPE ================= */

    let senderType = "agent";

    if (isCustomer) senderType = "customer";
    if (isCompany) senderType = "agent"; // company replies act like agent

    /* ================= PUSH MESSAGE ================= */

    ticket.messages.push({
      senderType,        // ✅ REQUIRED FIELD FIXED
      sender: user.id,
      message: message.trim(),
    });

    // update last reply timestamps
    if (senderType === "customer") {
      ticket.lastCustomerReplyAt = new Date();
    } else {
      ticket.lastAgentReplyAt = new Date();
    }

    ticket.lastReplyAt = new Date();

    await ticket.save();

    return NextResponse.json({
      success: true,
      msg: "Reply sent successfully",
    });
  } catch (err) {
    console.error("❌ reply error:", err);

    return NextResponse.json(
      { success: false, msg: "Server error", error: err.message },
      { status: 500 }
    );
  }
}



// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// export async function POST(req) {
//   await dbConnect();

//   const token = getTokenFromHeader(req);
//   if (!token) return NextResponse.json({ success:false, msg:"Unauthorized" }, { status:401 });

//   let user;
//   try { user = verifyJWT(token); } 
//   catch { return NextResponse.json({ success:false, msg:"Invalid token" }, { status:403 }); }

//   const { ticketId, message } = await req.json();
//   const ticket = await Ticket.findById(ticketId);

//   if (!ticket) return NextResponse.json({ success:false, msg:"Not found" }, { status:404 });

//   const canReply =
//     user.roles?.includes("admin") ||
//     ticket.customerId.toString() === user.id ||
//     ticket.agentId?.toString() === user.id;

//   if (!canReply)
//     return NextResponse.json({ success:false, msg:"Forbidden" }, { status:403 });

//   ticket.messages.push({
//     sender: user.id,
//     message,
//   });

//   await ticket.save();

//   return NextResponse.json({ success: true });
// }
