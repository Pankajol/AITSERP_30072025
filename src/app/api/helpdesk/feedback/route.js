export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import TicketFeedback from "@/models/helpdesk/TicketFeedback";
import Notification from "@/models/helpdesk/Notification";
import {sendMail} from "@/lib/mailer";
import feedbackEmail from "@/lib/feedbackEmail"; // ✅ REQUIRED
import { analyzeSentimentAI } from "@/utils/aiSentiment";
import jwt from "jsonwebtoken";

const FEEDBACK_SECRET = process.env.FEEDBACK_SECRET;

function generateToken(ticket) {
  return jwt.sign(
    {
      ticketId: ticket._id,
      customerEmail: ticket.customerEmail,
    },
    FEEDBACK_SECRET,
    { expiresIn: "7d" }
  );
}

/* ================= SEND FEEDBACK MAIL ================= */

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const ticketId = searchParams.get("ticketId");

    if (!ticketId) {
      return Response.json({ error: "ticketId required" }, { status: 400 });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return Response.json({ error: "Ticket not found" }, { status: 404 });
    }

    const exists = await TicketFeedback.findOne({ ticketId });
    if (exists) {
      return Response.json(
        { error: "Feedback already submitted" },
        { status: 409 }
      );
    }

    const token = generateToken(ticket);

    await sendMail({
      to: ticket.customerEmail,
      subject: `How was our support? Ticket #${ticket._id}`,
      html: feedbackEmail(ticket, token),
    });

    console.log("✅ Feedback email sent:", ticket.customerEmail);

    return Response.json({
      success: true,
      message: "Feedback email sent",
    });
  } catch (err) {
    console.error("❌ Feedback email error:", err);
    return Response.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}

