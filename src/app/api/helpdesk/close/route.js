export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function POST(req) {
  try {
    await dbConnect();

    /* ================= AUTH ================= */
    const token = getTokenFromHeader(req);
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    /* ================= BODY ================= */
    const { ticketId } = await req.json();
    if (!ticketId) {
      return Response.json({ error: "ticketId required" }, { status: 400 });
    }

    /* ================= FIND TICKET ================= */
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return Response.json({ error: "Ticket not found" }, { status: 404 });
    }

    /* ================= CLOSE TICKET ================= */
    ticket.status = "closed";
    ticket.closedAt = new Date();
    await ticket.save();

    /* ================= SEND FEEDBACK EMAIL ================= */
    // 🔥 ONE LINE – FEEDBACK EMAIL AUTO SEND
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/feedback?ticketId=${ticket._id}`
    ).catch(console.error);

    return Response.json({
      success: true,
      message: "Ticket closed and feedback email sent",
    });

  } catch (err) {
    console.error("❌ Ticket close error:", err);
    return Response.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
