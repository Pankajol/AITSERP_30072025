export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import TicketFeedback from "@/models/helpdesk/TicketFeedback";
import Notification from "@/models/helpdesk/Notification";
import { analyzeSentimentAI } from "@/utils/aiSentiment";
import jwt from "jsonwebtoken";

const FEEDBACK_SECRET = process.env.FEEDBACK_SECRET;

export async function POST(req) {
  try {
    await dbConnect();

    const { token, rating, comment } = await req.json();

    if (!token || !rating) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    // 🔐 verify token
    let payload;
    try {
      payload = jwt.verify(token, FEEDBACK_SECRET);
    } catch {
      return Response.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const { ticketId, customerEmail } = payload;

    // ❌ prevent duplicate
    const exists = await TicketFeedback.findOne({ ticketId });
    if (exists) {
      return Response.json({ error: "Feedback already submitted" }, { status: 409 });
    }

    // 🤖 sentiment
    const sentiment = analyzeSentimentAI(comment || "");

    const ticket = await Ticket.findById(ticketId);

    // 💾 save
    const feedback = await TicketFeedback.create({
      ticketId,
      customerEmail,
      rating,
      comment,
      sentiment,
      agentId: ticket?.assignedTo || null,
    });

    // 🔔 notify agent
    if (ticket?.assignedTo) {
      await Notification.create({
        userId: ticket.assignedTo,
        type: "feedback",
        message: `⭐ Customer rated ticket ${rating}/5`,
        refId: ticketId,
      });
    }

    return Response.json({ success: true, feedback });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json({ error: "Feedback already submitted" }, { status: 409 });
    }

    console.error("Feedback submit error:", err);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
