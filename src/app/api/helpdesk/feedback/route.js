export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import jwt from "jsonwebtoken";

import Ticket from "@/models/helpdesk/Ticket";
import TicketFeedback from "@/models/helpdesk/TicketFeedback";
import Notification from "@/models/helpdesk/Notification";

import { analyzeSentimentAI } from "@/utils/aiSentiment";
import sendMail  from "@/lib/mailer";

const FEEDBACK_SECRET = process.env.FEEDBACK_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_BASE_URL;

/* ===================== TOKEN UTILS ===================== */

function generateToken(ticket) {
  return jwt.sign(
    {
      ticketId: ticket._id.toString(),
      customerEmail: ticket.customerEmail,
    },
    FEEDBACK_SECRET,
    { expiresIn: "14d" }
  );
}

function verifyToken(token) {
  return jwt.verify(token, FEEDBACK_SECRET);
}

/* ===================== EMAIL TEMPLATE ===================== */

function feedbackEmail(ticket, token) {
  return `
    <div style="font-family:Arial">
      <h3>How was our support?</h3>

      <p>Your ticket <b>${ticket.subject}</b> has been closed.</p>

      <p>Please rate your experience:</p>

      <div style="font-size:22px">
        ${[1,2,3,4,5]
          .map(
            r =>
              `<a href="${APP_URL}/feedback?token=${token}&rate=${r}"
                 style="text-decoration:none;margin-right:6px">⭐</a>`
          )
          .join("")}
      </div>

      <p style="margin-top:15px">
        Or leave detailed feedback:
        <a href="${APP_URL}/feedback?token=${token}">Click here</a>
      </p>

      <p>Thanks,<br/>Support Team</p>
    </div>
  `;
}

/* =========================================================
   GET → SEND FEEDBACK EMAIL (on close / auto-close)
   ========================================================= */

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

    // prevent resending if feedback already given
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

/* =========================================================
   POST → SUBMIT FEEDBACK (email click / frontend)
   ========================================================= */

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    const { token, rating, comment = "" } = body;

    if (!token || !rating) {
      return Response.json(
        { error: "token and rating required" },
        { status: 400 }
      );
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return Response.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // block duplicate feedback
    const already = await TicketFeedback.findOne({
      ticketId: decoded.ticketId,
    });
    if (already) {
      return Response.json(
        { error: "Feedback already submitted" },
        { status: 409 }
      );
    }

    // AI sentiment
    const sentiment = await analyzeSentimentAI(comment);

    const feedback = await TicketFeedback.create({
      ticketId: decoded.ticketId,
      customerEmail: decoded.customerEmail,
      rating,
      comment,
      sentiment,
    });

    // save summary on ticket
    const ticket = await Ticket.findByIdAndUpdate(
      decoded.ticketId,
      {
        feedbackRating: rating,
        feedbackSentiment: sentiment,
      },
      { new: true }
    );

    // 🚨 LOW RATING ALERT
    if (rating <= 2 && ticket?.agentId) {
      await Notification.create({
        userId: ticket.agentId,
        type: "LOW_FEEDBACK",
        ticketId: ticket._id,
        message: "⚠️ Customer gave low feedback rating",
      });
    }

    return Response.json({
      success: true,
      message: "Feedback submitted successfully",
    });
  } catch (err) {
    console.error("❌ Feedback submit error:", err);
    return Response.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
