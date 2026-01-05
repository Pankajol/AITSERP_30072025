export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Customer from "@/models/CustomerModel";
import Company from "@/models/Company";
import { getNextAvailableAgent } from "@/utils/getNextAvailableAgent";
import { analyzeSentimentAI } from "@/utils/aiSentiment";

/* ===================== HELPERS ===================== */

function normalizeId(id) {
  if (!id) return "";
  let s = String(id).trim();
  if (s.startsWith("<") && s.endsWith(">")) s = s.slice(1, -1);
  return s.replace(/[\r\n\s]+/g, "");
}

function extractEmail(value) {
  if (!value) return "";
  if (Array.isArray(value)) value = value[0];

  if (typeof value === "object" && value !== null) {
    return (value.email || value.address || value.mail || "")
      .toString()
      .toLowerCase();
  }

  const m = String(value).match(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
  );
  return m ? m[1].toLowerCase() : "";
}

async function parseBody(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();

  if (ct.includes("application/json")) return await req.json();

  if (ct.includes("application/x-www-form-urlencoded")) {
    const txt = await req.text();
    return Object.fromEntries(new URLSearchParams(txt));
  }

  try {
    return JSON.parse(await req.text());
  } catch {
    return {};
  }
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ===================== ATTACHMENT PARSER ===================== */

function parseAttachments(raw) {
  const files = [];

  const attachments = raw.attachments || raw.attachment || [];

  if (!Array.isArray(attachments)) return files;

  for (const a of attachments) {
    files.push({
      filename: a.filename || "attachment",
      url: a.url || null,              // if provider gives hosted URL
      contentType: a.contentType || a.type || "application/octet-stream",
      size: a.size || null,
      content: a.content || null,      // base64 (optional)
    });
  }

  return files;
}

/* ===================== MAIN ===================== */

export async function POST(req) {
  try {
    console.log("📩 INBOUND EMAIL RECEIVED");

    /* ---------- AUTH ---------- */
    const { searchParams } = new URL(req.url);
    if (searchParams.get("secret") !== process.env.INBOUND_EMAIL_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const raw = await parseBody(req);

    /* ---------- EMAIL DATA ---------- */
    const fromEmail = extractEmail(raw.from || raw.sender || raw["From"]);
    const toEmail = extractEmail(raw.to || raw.recipient);
    const subject = raw.subject || "No Subject";
    const body = raw.text || raw.html || "";

    if (!fromEmail || !toEmail) {
      return Response.json({ error: "Invalid email" }, { status: 400 });
    }

    const messageId = normalizeId(raw.messageId || raw["Message-ID"]);
    const inReplyTo = normalizeId(raw.inReplyTo || raw["In-Reply-To"]);
    const references = (raw.references || "")
      .split(/\s+/)
      .map(normalizeId)
      .filter(Boolean);

    const attachments = parseAttachments(raw);

    console.log("📨 Incoming TO:", toEmail);
    console.log("📎 Attachments:", attachments.length);

    /* =====================================================
       1️⃣ FIND EXISTING TICKET (REPLY)
    ===================================================== */

    const ticket =
      (await Ticket.findOne({
        $or: [
          { emailThreadId: { $in: [messageId, inReplyTo, ...references] } },
          { "messages.messageId": { $in: [messageId, inReplyTo, ...references] } },
        ],
      })) || null;

    /* ---------- DUPLICATE ---------- */
    if (ticket && messageId) {
      const exists = ticket.messages.find(m => m.messageId === messageId);
      if (exists) {
        console.log("♻️ Duplicate email ignored");
        return Response.json({ success: true, ticketId: ticket._id });
      }
    }

    /* =====================================================
       2️⃣ REPLY → APPEND MESSAGE
    ===================================================== */

    if (ticket) {
      const sentiment = await analyzeSentimentAI(body);

      ticket.messages.push({
        senderType: "customer",
        externalEmail: fromEmail,
        message: body,
        messageId,
        sentiment,
        attachments,
        createdAt: new Date(),
      });

      ticket.lastCustomerReplyAt = new Date();
      ticket.sentiment = sentiment;
      await ticket.save();

      console.log("🔁 Reply appended with attachments");
      return Response.json({ success: true, ticketId: ticket._id });
    }

    /* =====================================================
       3️⃣ NEW EMAIL → COMPANY
    ===================================================== */

    const company = await Company.findOne({
      supportEmails: toEmail,
    }).select("_id companyName");

    if (!company) {
      console.log("⛔ Invalid mailbox");
      return Response.json({ error: "Invalid mailbox" }, { status: 403 });
    }

    /* =====================================================
       4️⃣ CUSTOMER
    ===================================================== */

    const customer = await Customer.findOne({
      emailId: { $regex: new RegExp("^" + escapeRegExp(fromEmail) + "$", "i") },
      companyId: company._id,
    });

    if (!customer) {
      console.log("⛔ Unknown customer:", fromEmail);
      return Response.json({ error: "Unknown customer" }, { status: 403 });
    }

    /* =====================================================
       5️⃣ CREATE TICKET
    ===================================================== */

    const sentiment = await analyzeSentimentAI(body);
    const agentId = await getNextAvailableAgent(customer);

    const newTicket = await Ticket.create({
      companyId: company._id,
      customerId: customer._id,
      customerEmail: fromEmail,
      subject,
      source: "email",
      status: "open",
      agentId,
      sentiment,
      priority: sentiment === "negative" ? "high" : "normal",
      emailThreadId: messageId || `mail-${Date.now()}`,
      emailAlias: toEmail,

      messages: [
        {
          senderType: "customer",
          externalEmail: fromEmail,
          message: body,
          messageId,
          sentiment,
          attachments,
          createdAt: new Date(),
        },
      ],

      lastCustomerReplyAt: new Date(),
    });

    console.log("🎯 New ticket created with attachments:", newTicket._id);

    return Response.json({ success: true, ticketId: newTicket._id });
  } catch (err) {
    console.error("❌ Inbound error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}




// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import Customer from "@/models/CustomerModel";
// import Company from "@/models/Company";
// import Notification from "@/models/helpdesk/Notification";
// import { getNextAvailableAgent } from "@/utils/getNextAvailableAgent";
// import { analyzeSentimentAI } from "@/utils/aiSentiment";

// /* ===================== HELPERS ===================== */

// function normalizeId(id) {
//   if (!id) return "";
//   let s = String(id).trim();
//   if (s.startsWith("<") && s.endsWith(">")) s = s.slice(1, -1);
//   return s.replace(/[\r\n\s]+/g, "");
// }

// function extractEmail(value) {
//   if (!value) return "";
//   if (Array.isArray(value)) value = value[0];
//   if (typeof value === "object" && value !== null) {
//     return (value.email || value.address || value.mail || "")
//       .toString()
//       .toLowerCase();
//   }
//   const m = String(value).match(
//     /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
//   );
//   return m ? m[1].toLowerCase() : "";
// }

// async function parseBody(req) {
//   const ct = (req.headers.get("content-type") || "").toLowerCase();
//   if (ct.includes("application/json")) return await req.json();
//   if (ct.includes("application/x-www-form-urlencoded")) {
//     const txt = await req.text();
//     return Object.fromEntries(new URLSearchParams(txt));
//   }
//   try {
//     return JSON.parse(await req.text());
//   } catch {
//     return {};
//   }
// }

// function escapeRegExp(str) {
//   return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// }

// /* ===================== MAIN ===================== */

// export async function POST(req) {
//   try {
//     console.log("📩 INBOUND EMAIL RECEIVED");

//     /* ---------- AUTH ---------- */
//     const { searchParams } = new URL(req.url);
//     if (searchParams.get("secret") !== process.env.INBOUND_EMAIL_SECRET) {
//       return Response.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     await dbConnect();
//     const raw = await parseBody(req);

//     /* ---------- EMAIL DATA ---------- */
//     const fromEmail = extractEmail(raw.from || raw.sender || raw["From"]);
//     const toEmail = extractEmail(raw.to || raw.recipient);
//     const subject = raw.subject || "No Subject";
//     const body = raw.text || raw.html || "";

//     if (!fromEmail || !toEmail) {
//       return Response.json({ error: "Invalid email" }, { status: 400 });
//     }

//     const messageId = normalizeId(raw.messageId || raw["Message-ID"]);
//     const inReplyTo = normalizeId(raw.inReplyTo);
//     const references = (raw.references || "")
//       .split(/\s+/)
//       .map(normalizeId)
//       .filter(Boolean);

//     /* ---------- COMPANY MATCH ---------- */
//     const company = await Company.findOne({
//       supportEmails: toEmail,
//     }).select("_id companyName supportEmails");

//     console.log("📨 Incoming TO:", toEmail);
//     console.log("🏢 Company match:", company?.companyName || "None");

//     if (!company && !inReplyTo && references.length === 0) {
//       console.log("⛔ Invalid mailbox");
//       return Response.json({ error: "Invalid mailbox" }, { status: 403 });
//     }

//     /* ---------- CUSTOMER ---------- */
//     const customer = await Customer.findOne({
//       emailId: { $regex: new RegExp("^" + escapeRegExp(fromEmail) + "$", "i") },
//       companyId: company?._id,
//     });

//     if (!customer) {
//       console.log("⛔ Unknown customer:", fromEmail);
//       return Response.json({ error: "Unknown customer" }, { status: 403 });
//     }

//     /* ---------- DUPLICATE ---------- */
//     if (messageId) {
//       const dup = await Ticket.findOne({ "messages.messageId": messageId });
//       if (dup) {
//         return Response.json({ success: true, ticketId: dup._id });
//       }
//     }

//     /* ---------- FIND TICKET ---------- */
//     const ticket =
//       (await Ticket.findOne({
//         $or: [
//           { emailThreadId: { $in: [messageId, inReplyTo, ...references] } },
//           { "messages.messageId": { $in: [messageId, inReplyTo, ...references] } },
//         ],
//       })) || null;

//     const sentiment = await analyzeSentimentAI(body);

//     /* ---------- REPLY ---------- */
//     if (ticket) {
//       ticket.messages.push({
//         senderType: "customer",
//         externalEmail: fromEmail,
//         message: body,
//         messageId,
//         sentiment,
//         createdAt: new Date(),
//       });

//       ticket.lastCustomerReplyAt = new Date();
//       ticket.sentiment = sentiment;
//       await ticket.save();

//       return Response.json({ success: true, ticketId: ticket._id });
//     }

//     /* ---------- NEW TICKET ---------- */
//     const agentId = await getNextAvailableAgent(customer);

//     const newTicket = await Ticket.create({
//       companyId: company._id,
//       customerId: customer._id,
//       customerEmail: fromEmail,
//       subject,
//       source: "email",
//       status: "open",
//       agentId,
//       sentiment,
//       priority: sentiment === "negative" ? "high" : "normal",
//       emailThreadId: messageId || `mail-${Date.now()}`,
//       messages: [
//         {
//           senderType: "customer",
//           externalEmail: fromEmail,
//           message: body,
//           messageId,
//           sentiment,
//           createdAt: new Date(),
//         },
//       ],
//       lastCustomerReplyAt: new Date(),
//     });

//     console.log("🎯 Routed to company:", company.companyName);
//     console.log("🎯 Assigned agent:", agentId);

//     return Response.json({ success: true, ticketId: newTicket._id });
//   } catch (err) {
//     console.error("❌ Inbound error:", err);
//     return Response.json({ error: err.message }, { status: 500 });
//   }
// }


