export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import TicketFeedback from "@/models/helpdesk/TicketFeedback";
import Company from "@/models/Company";
import feedbackEmail from "@/lib/feedbackEmail";
import jwt from "jsonwebtoken";

const FEEDBACK_SECRET = process.env.FEEDBACK_SECRET;

/* ================= TOKEN ================= */

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

/* ================= GRAPH TOKEN ================= */

async function getGraphToken(se) {
  const params = new URLSearchParams({
    client_id: se.clientId,
    client_secret: se.appPassword,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${se.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }
  );

  const data = await res.json();
  if (!data.access_token) throw new Error("Graph auth failed");

  return data.access_token;
}

/* ================= SEND OUTLOOK MAIL ================= */

async function sendOutlookMail({ supportEmail, to, subject, html }) {
  const token = await getGraphToken(supportEmail);

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${supportEmail.email}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: {
            contentType: "HTML",
            content: html,
          },
          toRecipients: [
            {
              emailAddress: { address: to },
            },
          ],
        },
        saveToSentItems: true,
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Outlook sendMail failed: " + (await res.text()));
  }
}

/* ================= MAIN ================= */

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
      return Response.json({ error: "Feedback already submitted" }, { status: 409 });
    }

    const company = await Company.findById(ticket.companyId).select(
      "+supportEmails.appPassword"
    );

    if (!company?.supportEmails?.length) {
      throw new Error("No support mailbox configured");
    }

    // 🔥 use same alias as ticket
    const alias = (ticket.emailAlias || "").toLowerCase();

    const support = company.supportEmails.find(
      (e) => e.type === "outlook" && e.email?.toLowerCase() === alias
    );

    if (!support) throw new Error("Outlook support mailbox not found");

    const token = generateToken(ticket);

    await sendOutlookMail({
      supportEmail: support,
      to: ticket.customerEmail,
      subject: `How was our support? Ticket #${ticket._id}`,
      html: feedbackEmail(ticket, token),
    });

    console.log("✅ Outlook feedback sent:", ticket.customerEmail);

    return Response.json({
      success: true,
      message: "Feedback email sent",
    });
  } catch (err) {
    console.error("❌ Feedback email error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}





// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import TicketFeedback from "@/models/helpdesk/TicketFeedback";
// import Notification from "@/models/helpdesk/Notification";
// import {sendMail} from "@/lib/mailer";
// import feedbackEmail from "@/lib/feedbackEmail"; // ✅ REQUIRED
// import { analyzeSentimentAI } from "@/utils/aiSentiment";
// import jwt from "jsonwebtoken";

// const FEEDBACK_SECRET = process.env.FEEDBACK_SECRET;

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

// /* ================= SEND FEEDBACK MAIL ================= */

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
//       html: feedbackEmail(ticket, token),
//     });

//     console.log("✅ Feedback email sent:", ticket.customerEmail);

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

