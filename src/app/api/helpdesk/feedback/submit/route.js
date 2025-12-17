// app/api/helpdesk/feedback/submit/route.js
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

    const payload = jwt.verify(token, FEEDBACK_SECRET);
    const { ticketId, customerEmail } = payload;

    const exists = await TicketFeedback.findOne({ ticketId });
    if (exists) {
      return Response.json({ error: "Feedback already submitted" }, { status: 409 });
    }

    const ticket = await Ticket.findById(ticketId);

    const sentiment = analyzeSentimentAI(comment || "");

    await TicketFeedback.create({
      ticketId,
      customerEmail,
      rating,
      comment,
      sentiment,
      agentId: ticket?.assignedTo || null,
    });

    if (ticket?.assignedTo) {
      await Notification.create({
        userId: ticket.assignedTo,
        type: "feedback",
        message: `⭐ Customer rated ticket ${rating}/5`,
        refId: ticketId,
      });
    }

    return Response.json({ success: true });
  } catch (err) {
    if (err.code === 11000) {
      return Response.json({ error: "Feedback already submitted" }, { status: 409 });
    }
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
