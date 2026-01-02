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

    /* ---------- BODY ---------- */
    const { token, rating, comment } = await req.json();

    if (!token || typeof rating !== "number") {
      return Response.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return Response.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    /* ---------- VERIFY TOKEN ---------- */
    let payload;
    try {
      payload = jwt.verify(token, FEEDBACK_SECRET);
    } catch {
      return Response.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { ticketId, companyId, customerEmail } = payload;

    if (!ticketId || !companyId) {
      return Response.json(
        { error: "Invalid token payload" },
        { status: 400 }
      );
    }

    /* ---------- DUPLICATE CHECK ---------- */
    const exists = await TicketFeedback.findOne({
      ticketId,
      companyId,
    });

    if (exists) {
      return Response.json(
        { error: "Feedback already submitted" },
        { status: 409 }
      );
    }

    /* ---------- LOAD TICKET (COMPANY SAFE) ---------- */
    const ticket = await Ticket.findOne({
      _id: ticketId,
      companyId,
    });

    if (!ticket) {
      return Response.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    /* ---------- SENTIMENT ---------- */
    const sentiment = await analyzeSentimentAI(comment || "");

    /* ---------- SAVE FEEDBACK ---------- */
    const feedback = await TicketFeedback.create({
      companyId,                 // 🔥 IMPORTANT
      ticketId: ticket._id,
      agentId: ticket.agentId || null,
      customerEmail,
      rating,
      comment: comment || "",
      sentiment,
      agentId: ticket.agentId || null,
    });

    /* ---------- NOTIFICATION ---------- */
    if (ticket.agentId) {
      await Notification.create({
        companyId,
        userId: ticket.agentId,
        type: "feedback",
        message: `⭐ Customer rated ticket ${rating}/5`,
        refId: ticket._id,
      });
    }

    /* ---------- UPDATE TICKET (OPTIONAL BUT GOOD) ---------- */
    ticket.feedbackRating = rating;
    ticket.feedbackSentiment = sentiment?.label || null;
    await ticket.save();

    return Response.json({
      success: true,
      feedbackId: feedback._id,
    });
  } catch (err) {
    console.error("❌ Feedback submit error:", err);

    if (err.code === 11000) {
      return Response.json(
        { error: "Feedback already submitted" },
        { status: 409 }
      );
    }

    return Response.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}




// // app/api/helpdesk/feedback/submit/route.js
// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import TicketFeedback from "@/models/helpdesk/TicketFeedback";
// import Notification from "@/models/helpdesk/Notification";
// import { analyzeSentimentAI } from "@/utils/aiSentiment";
// import jwt from "jsonwebtoken";

// const FEEDBACK_SECRET = process.env.FEEDBACK_SECRET;

// export async function POST(req) {
//   try {
//     await dbConnect();

//     const { token, rating, comment } = await req.json();

//     if (!token || !rating) {
//       return Response.json({ error: "Invalid request" }, { status: 400 });
//     }

//     const payload = jwt.verify(token, FEEDBACK_SECRET);
//     const { ticketId, customerEmail } = payload;

//     const exists = await TicketFeedback.findOne({ ticketId });
//     if (exists) {
//       return Response.json({ error: "Feedback already submitted" }, { status: 409 });
//     }

//     const ticket = await Ticket.findById(ticketId);

//     const sentiment = analyzeSentimentAI(comment || "");

//     await TicketFeedback.create({
//       ticketId,
//       customerEmail,
//       rating,
//       comment,
//       sentiment,
//       agentId: ticket?.assignedTo || null,
//     });

//     if (ticket?.assignedTo) {
//       await Notification.create({
//         userId: ticket.assignedTo,
//         type: "feedback",
//         message: `⭐ Customer rated ticket ${rating}/5`,
//         refId: ticketId,
//       });
//     }

//     return Response.json({ success: true });
//   } catch (err) {
//     if (err.code === 11000) {
//       return Response.json({ error: "Feedback already submitted" }, { status: 409 });
//     }
//     return Response.json({ error: "Server error" }, { status: 500 });
//   }
// }
