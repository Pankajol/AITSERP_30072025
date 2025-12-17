export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

/* ===============================
   POST → CLOSE TICKET
================================ */

export async function POST(req) {
  try {
    await dbConnect();

    /* ================= AUTH ================= */
    const token = getTokenFromHeader(req);
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = verifyJWT(token);
    } catch {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    /* ================= BODY ================= */
    const { ticketId } = await req.json();
    if (!ticketId) {
      return Response.json({ error: "ticketId required" }, { status: 400 });
    }

    /* ================= CLOSE TICKET ================= */
    const ticket = await Ticket.findByIdAndUpdate(
      ticketId,
      {
        status: "closed",
        closedAt: new Date(),
      },
      { new: true } // 🔥 return updated ticket
    );

    if (!ticket) {
      return Response.json({ error: "Ticket not found" }, { status: 404 });
    }

    /* ================= SEND FEEDBACK EMAIL ================= */
    // ✅ server-safe base url
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

    // fire & forget (don’t block response)
    fetch(`${baseUrl}/api/helpdesk/feedback?ticketId=${ticket._id}`)
      .catch((err) =>
        console.error("❌ Feedback trigger failed:", err)
      );

    /* ================= RESPONSE ================= */
    return Response.json({
      success: true,
      message: "Ticket closed and feedback email sent",
      ticket, // 🔥 VERY IMPORTANT
    });

  } catch (err) {
    console.error("❌ Ticket close error:", err);
    return Response.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
