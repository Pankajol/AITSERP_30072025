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


// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import TicketFeedback from "@/models/helpdesk/TicketFeedback";
// import Notification from "@/models/helpdesk/Notification";
// import sendMail from "@/lib/mailer";
// import { analyzeSentimentAI } from "@/utils/aiSentiment";
// import jwt from "jsonwebtoken";

// /* ================= TOKEN HELPERS ================= */

// const FEEDBACK_SECRET = process.env.FEEDBACK_SECRET || "feedback-secret";

// function generateToken(ticket) {
//   return jwt.sign(
//     {
//       ticketId: ticket._id,
//       customerEmail: ticket.customerEmail,
//     },
//     FEEDBACK_SECRET,
//     { expiresIn: "7d" }
//   );
// }

// function verifyToken(token) {
//   return jwt.verify(token, FEEDBACK_SECRET);
// }

// /* =================================================
//    GET → SEND FEEDBACK EMAIL
// ================================================= */

// export async function GET(req) {
//   try {
//     await dbConnect();

//     const { searchParams } = new URL(req.url);
//     const ticketId = searchParams.get("ticketId");

//     if (!ticketId) {
//       return Response.json({ error: "ticketId required" }, { status: 400 });
//     }

//     const ticket = await Ticket.findById(ticketId);
//     if (!ticket) {
//       return Response.json({ error: "Ticket not found" }, { status: 404 });
//     }

//     const exists = await TicketFeedback.findOne({ ticketId });
//     if (exists) {
//       return Response.json(
//         { error: "Feedback already submitted" },
//         { status: 409 }
//       );
//     }

//     const token = generateToken(ticket);

//     await sendMail({
//       to: ticket.customerEmail,
//       subject: `How was our support? Ticket #${ticket._id}`,
//       html: feedbackEmail(ticket, token), // assuming defined
//     });

//     return Response.json({
//       success: true,
//       message: "Feedback email sent",
//     });
//   } catch (err) {
//     console.error("❌ Feedback email error:", err);
//     return Response.json(
//       { error: err.message || "Server error" },
//       { status: 500 }
//     );
//   }
// }

// /* =================================================
//    POST → SUBMIT FEEDBACK
// ================================================= */

// export async function POST(req) {
//   try {
//     await dbConnect();

//     const { token, rating, comment = "" } = await req.json();

//     if (!token || !rating) {
//       return Response.json(
//         { error: "token and rating required" },
//         { status: 400 }
//       );
//     }

//     let decoded;
//     try {
//       decoded = verifyToken(token);
//     } catch {
//       return Response.json(
//         { error: "Invalid or expired token" },
//         { status: 401 }
//       );
//     }

//     const already = await TicketFeedback.findOne({
//       ticketId: decoded.ticketId,
//     });
//     if (already) {
//       return Response.json(
//         { error: "Feedback already submitted" },
//         { status: 409 }
//       );
//     }

//     const sentiment = await analyzeSentimentAI(comment);

//     const feedback = await TicketFeedback.create({
//       ticketId: decoded.ticketId,
//       customerEmail: decoded.customerEmail,
//       rating,
//       comment,
//       sentiment,
//     });

//     const ticket = await Ticket.findByIdAndUpdate(
//       decoded.ticketId,
//       {
//         feedbackRating: rating,
//         feedbackSentiment: sentiment,
//       },
//       { new: true }
//     );

//     if (rating <= 2 && ticket?.agentId) {
//       await Notification.create({
//         userId: ticket.agentId,
//         type: "LOW_FEEDBACK",
//         ticketId: ticket._id,
//         message: "⚠️ Customer gave low feedback rating",
//       });
//     }

//     return Response.json({
//       success: true,
//       message: "Feedback submitted successfully",
//     });
//   } catch (err) {
//     console.error("❌ Feedback submit error:", err);
//     return Response.json(
//       { error: err.message || "Server error" },
//       { status: 500 }
//     );
//   }
// }
