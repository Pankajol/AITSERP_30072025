// app/api/helpdesk/tickets/[id]/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import CompanyUser from "@/models/CompanyUser";
import Customer from "@/models/CustomerModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";



export async function GET(req, { params }) {
  try {
    await connectDB();

    /* ============== AUTH ============== */
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json(
        { success: false, msg: "Unauthorized" },
        { status: 401 }
      );
    }

    verifyJWT(token); // throws if invalid

    /* ============== PARAM (FIXED) ============== */
    const { id: ticketId } = await params; // ✅ THIS IS THE FIX

    if (!ticketId) {
      return NextResponse.json(
        { success: false, msg: "Ticket id missing" },
        { status: 400 }
      );
    }

    /* ============== FETCH TICKET ============== */
    const ticket = await Ticket.findById(ticketId)
      .populate("customerId", "customerName emailId avatar")
      .populate("agentId", "name email avatar")
      .populate("messages.sender", "name email avatar")
      .lean();

    if (!ticket) {
      return NextResponse.json(
        { success: false, msg: "Ticket not found" },
        { status: 404 }
      );
    }

    /* ============== RESPONSE ============== */
    return NextResponse.json({
      success: true,
      ticket,
    });

  } catch (err) {
    console.error("GET /api/helpdesk/tickets/[id] error:", err);
    return NextResponse.json(
      { success: false, msg: err.message || "Server error" },
      { status: 500 }
    );
  }
}
