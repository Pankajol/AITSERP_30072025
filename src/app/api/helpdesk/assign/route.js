import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import mongoose from "mongoose";

export async function POST(req) {
  try {
    await connectDB();

    // ==========================
    // AUTH CHECK
    // ==========================
    const token = getTokenFromHeader(req);

    if (!token) {
      return NextResponse.json(
        { success: false, msg: "Unauthorized" },
        { status: 401 }
      );
    }

    let decoded;
    try {
      decoded = await verifyJWT(token);
    } catch (err) {
      return NextResponse.json(
        { success: false, msg: "Invalid token" },
        { status: 401 }
      );
    }

    // ==========================
    // PERMISSION CHECK
    // ==========================
    const userRoles = decoded?.roles?.map(r => r.toLowerCase()) || [];

    const isCompany = decoded?.type === "company";
    const isAgent = userRoles.includes("agent");

    // 👇 company + agent both allowed
    if (!isCompany && !isAgent) {
      return NextResponse.json(
        { success: false, msg: "Permission denied" },
        { status: 403 }
      );
    }

    const userCompanyId = decoded.companyId;

    if (!userCompanyId) {
      return NextResponse.json(
        { success: false, msg: "CompanyId missing in token" },
        { status: 403 }
      );
    }

    // ==========================
    // BODY
    // ==========================
    const body = await req.json();
    const { ticketId, agentId, priority } = body;

    console.log("📦 ASSIGN BODY =>", body);

    if (!ticketId || !mongoose.Types.ObjectId.isValid(ticketId)) {
      return NextResponse.json(
        { success: false, msg: "Invalid ticketId" },
        { status: 400 }
      );
    }

    if (!agentId || !mongoose.Types.ObjectId.isValid(agentId)) {
      return NextResponse.json(
        { success: false, msg: "Invalid agentId" },
        { status: 400 }
      );
    }

    // ==========================
    // FIND TICKET (COMPANY SAFE)
    // ==========================
    const ticket = await Ticket.findOne({
      _id: ticketId,
      companyId: userCompanyId,
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, msg: "Ticket not found in your company" },
        { status: 404 }
      );
    }

    // ==========================
    // FIND AGENT (SAME COMPANY)
    // ==========================
    const agent = await CompanyUser.findOne({
      _id: agentId,
      companyId: userCompanyId,
    });

    if (!agent) {
      return NextResponse.json(
        { success: false, msg: "Agent not found in your company" },
        { status: 404 }
      );
    }

    // ==========================
    // AGENT STATUS CHECK
    // ==========================
    if (!agent.isActive) {
      return NextResponse.json(
        { success: false, msg: "Agent is inactive" },
        { status: 400 }
      );
    }

    if (agent.onLeave) {
      return NextResponse.json(
        { success: false, msg: "Agent is currently on leave" },
        { status: 400 }
      );
    }

    // ==========================
    // ASSIGN / REASSIGN LOGIC
    // ==========================
    if (ticket.agentId && ticket.agentId.toString() === agentId) {
      const populated = await Ticket.findById(ticketId).populate(
        "agentId",
        "name email avatar"
      );

      return NextResponse.json({
        success: true,
        msg: "Already assigned to this agent",
        ticket: populated,
      });
    }

    // 👇 overwrite = reassign allowed
    ticket.agentId = agentId;

    if (priority) {
      ticket.priority = priority.toLowerCase();
    }

    // ==========================
    // SLA CALCULATION
    // ==========================
    const SLA_MAP = {
      low: 48,
      normal: 24,
      high: 8,
      critical: 1,
    };

    const hrs = SLA_MAP[ticket.priority] || 24;
    ticket.slaDue = new Date(Date.now() + hrs * 60 * 60 * 1000);

    await ticket.save();

    const updated = await Ticket.findById(ticketId).populate(
      "agentId",
      "name email avatar"
    );

    return NextResponse.json({
      success: true,
      msg: "Ticket assigned / reassigned successfully",
      ticket: updated,
    });
  } catch (err) {
    console.error("❌ assign error:", err);

    return NextResponse.json(
      {
        success: false,
        msg: "Server error",
        error: err.message,
      },
      { status: 500 }
    );
  }
}





// // app/api/helpdesk/assign/route.js
// import { NextResponse } from "next/server";
// import connectDB from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import CompanyUser from "@/models/CompanyUser"; // your agent/customer model
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// export async function POST(req) {
//   try {
//     await connectDB();

//     // auth
//     const token = getTokenFromHeader(req);
//     if (!token)
//       return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });

//     try {
//       await verifyJWT(token);
//     } catch (err) {
//       return NextResponse.json({ success: false, msg: "Invalid token" }, { status: 401 });
//     }

//     const body = await req.json();
//     const ticketId = body.ticketId;
//     const agentId = body.agentId;
//     const priority = body.priority;

//     if (!ticketId) return NextResponse.json({ success: false, msg: "ticketId required" }, { status: 400 });
//     if (!agentId) return NextResponse.json({ success: false, msg: "agentId required" }, { status: 400 });

//     const agent = await CompanyUser.findById(agentId);
//     if (!agent) return NextResponse.json({ success: false, msg: "Agent not found" }, { status: 404 });

//     const ticket = await Ticket.findById(ticketId);
//     if (!ticket) return NextResponse.json({ success: false, msg: "Ticket not found" }, { status: 404 });

//     // already assigned?
//     if (ticket.agentId) {
//       if (ticket.agentId.toString() === agentId)
//         return NextResponse.json({ success: true, msg: "Already assigned", ticket });

//       return NextResponse.json(
//         { success: false, msg: "Ticket already assigned to another agent" },
//         { status: 409 }
//       );
//     }

//     // assign
//     ticket.agentId = agentId;

//     if (priority) ticket.priority = priority;

//     // simple SLA logic
//     const now = new Date();
//     const prio = (ticket.priority || "normal").toLowerCase();
//     let hrs = 24;
//     if (prio === "low") hrs = 48;
//     if (prio === "high") hrs = 8;
//     if (prio === "critical") hrs = 1;
//     ticket.slaDue = new Date(now.getTime() + hrs * 60 * 60 * 1000);

//     await ticket.save();

//     const updated = await Ticket.findById(ticketId).populate("agentId", "name email avatar");

//     return NextResponse.json({ success: true, msg: "Ticket assigned", ticket: updated });
//   } catch (err) {
//     console.error("assign error:", err);
//     return NextResponse.json({ success: false, msg: err.message }, { status: 500 });
//   }
// }
