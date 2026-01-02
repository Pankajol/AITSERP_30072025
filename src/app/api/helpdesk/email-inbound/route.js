export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Customer from "@/models/CustomerModel";
import Company from "@/models/Company";
import { getNextAvailableAgent } from "@/utils/getNextAvailableAgent";
import { analyzeSentimentAI } from "@/utils/aiSentiment";

import { writeFile, mkdir } from "fs/promises";
import path from "path";

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
    return (value.email || value.address || "").toLowerCase();
  }
  const m = String(value).match(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
  );
  return m ? m[1].toLowerCase() : "";
}

async function parseBody(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) return await req.json();
  try {
    return JSON.parse(await req.text());
  } catch {
    return {};
  }
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ===================== FILE UPLOAD ===================== */

async function uploadAttachment(buffer, filename) {
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const safeName = `${Date.now()}-${filename}`;
  const filePath = path.join(uploadDir, safeName);

  await writeFile(filePath, buffer);
  return `/uploads/${safeName}`; // public URL
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
    const fromEmail = extractEmail(raw.from);
    const toEmail = extractEmail(raw.to);
    const subject = raw.subject || "No Subject";

    let htmlBody = raw.html || raw.text || "";
    const messageId = normalizeId(raw.messageId || raw["Message-ID"]);
    const inReplyTo = normalizeId(raw.inReplyTo);
    const references = (raw.references || "")
      .split(/\s+/)
      .map(normalizeId)
      .filter(Boolean);

    if (!fromEmail || !toEmail) {
      return Response.json({ error: "Invalid email" }, { status: 400 });
    }

    /* ---------- COMPANY ---------- */
    const company = await Company.findOne({
      supportEmails: toEmail,
    });

    if (!company) {
      return Response.json({ error: "Invalid mailbox" }, { status: 403 });
    }

    /* ---------- CUSTOMER ---------- */
    const customer = await Customer.findOne({
      emailId: new RegExp("^" + escapeRegExp(fromEmail) + "$", "i"),
      companyId: company._id,
    });

    if (!customer) {
      return Response.json({ error: "Unknown customer" }, { status: 403 });
    }

    /* ---------- DUPLICATE CHECK ---------- */
    if (messageId) {
      const dup = await Ticket.findOne({
        "messages.messageId": messageId,
      });
      if (dup) {
        return Response.json({ success: true, ticketId: dup._id });
      }
    }

    /* ---------- ATTACHMENTS + CID ---------- */
    const attachments = [];

    if (Array.isArray(raw.attachments)) {
      for (const att of raw.attachments) {
        if (!att.content || !att.filename) continue;

        const url = await uploadAttachment(att.content, att.filename);

        attachments.push({
          filename: att.filename,
          url,
        });

        // replace cid with real URL
        if (att.cid) {
          htmlBody = htmlBody.replace(
            new RegExp(`cid:${escapeRegExp(att.cid)}`, "g"),
            url
          );
        }
      }
    }

    /* ---------- SENTIMENT ---------- */
    const sentiment = await analyzeSentimentAI(htmlBody);

    /* ---------- FIND TICKET ---------- */
    const ticket =
      (await Ticket.findOne({
        $or: [
          { emailThreadId: { $in: [messageId, inReplyTo, ...references] } },
          { "messages.messageId": { $in: [messageId, inReplyTo, ...references] } },
        ],
      })) || null;

    /* ---------- EXISTING TICKET ---------- */
    if (ticket) {
      ticket.messages.push({
        senderType: "customer",
        externalEmail: fromEmail,
        message: htmlBody,
        attachments,
        messageId,
        sentiment,
        createdAt: new Date(),
      });

      ticket.lastCustomerReplyAt = new Date();
      ticket.sentiment = sentiment;
      await ticket.save();

      return Response.json({ success: true, ticketId: ticket._id });
    }

    /* ---------- NEW TICKET ---------- */
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
      messages: [
        {
          senderType: "customer",
          externalEmail: fromEmail,
          message: htmlBody,
          attachments,
          messageId,
          sentiment,
          createdAt: new Date(),
        },
      ],
      lastCustomerReplyAt: new Date(),
    });

    return Response.json({ success: true, ticketId: newTicket._id });
  } catch (err) {
    console.error("❌ Inbound email error:", err);
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


