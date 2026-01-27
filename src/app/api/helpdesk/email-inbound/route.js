export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Customer from "@/models/CustomerModel";
import Company from "@/models/Company";
import Notification from "@/models/helpdesk/Notification";
import { getNextAvailableAgent } from "@/utils/getNextAvailableAgent";
import { analyzeSentimentAI } from "@/utils/aiSentiment";
import cloudinary from "@/lib/cloudinary";
import { simpleParser } from "mailparser";

/* ================= HELPERS ================= */
function extractEmail(v) {
  const m = String(v || "").match(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
  );
  return m ? m[1].toLowerCase() : "";
}

function normalizeId(id) {
  if (!id) return "";
  let s = String(id).trim();
  if (s.startsWith("<") && s.endsWith(">")) s = s.slice(1, -1);
  return s.replace(/[\r\n\s]+/g, "");
}

/* ================= UNIVERSAL ATTACHMENT UPLOADER ================= */
async function uploadAttachments(rawAttachments, ticketId) {
  const uploaded = [];

  for (const a of rawAttachments || []) {
    try {
      const fileData = a.content || a.buffer;
      if (!fileData) continue;

      let uploadStr;
      if (Buffer.isBuffer(fileData)) {
        uploadStr = `data:${a.contentType};base64,${fileData.toString("base64")}`;
      } else {
        uploadStr = fileData.startsWith("data:") ? fileData : `data:${a.contentType};base64,${fileData}`;
      }

      const res = await cloudinary.uploader.upload(uploadStr, {
        folder: `helpdesk/tickets/${ticketId}`,
        resource_type: "auto",
      });

      uploaded.push({
        filename: a.filename || a.Name || "file",
        url: res.secure_url,
        contentType: a.contentType || "application/octet-stream",
        size: a.size || a.ContentLength || 0,
      });
    } catch (err) {
      console.error("❌ Cloudinary Error:", err.message);
    }
  }

  return uploaded;
}

/* ================= MAIN ================= */
export async function POST(req) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("secret") !== process.env.INBOUND_EMAIL_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // --- Parse rawData ---
    const contentType = req.headers.get("content-type") || "";
    let rawData;
    if (contentType.includes("application/json")) {
      rawData = await req.json();
    } else {
      const text = await req.text();
      try {
        rawData = JSON.parse(text);
      } catch {
        rawData = {};
      }
    }

    // --- OUTLOOK NORMALIZATION ---
    if (!rawData.from && rawData.sender?.emailAddress?.address) {
      rawData.from = rawData.sender.emailAddress.address;
    }
    if (!rawData.to && Array.isArray(rawData.toRecipients)) {
      rawData.to = rawData.toRecipients
        .map((r) => r.emailAddress?.address)
        .join(", ");
    }

    // --- Extract basic info ---
    const fromEmail = extractEmail(rawData.from || rawData.sender || rawData.From);
    const toEmail = extractEmail(rawData.to || rawData.recipient);
    const subject = rawData.subject || rawData.Subject || "No Subject";
    const body = rawData.text || rawData.html || rawData.body?.content || "";

    if (!fromEmail) return Response.json({ error: "Missing sender" }, { status: 400 });

    const messageId = normalizeId(
      rawData.messageId || rawData["Message-ID"] || rawData.internetMessageId || `outlook-${Date.now()}`
    );
    const inReplyTo = normalizeId(rawData.inReplyTo || rawData["In-Reply-To"]);
    const references = (rawData.references || "").split(/\s+/).map(normalizeId).filter(Boolean);

    // --- Parse attachments ---
    let attachments = [];
    if (rawData.attachments || rawData.Attachments) {
      attachments = rawData.attachments || rawData.Attachments;
    }
    const mimeSource = rawData.raw || rawData.mime || rawData["body-mime"];
    if (mimeSource && attachments.length === 0) {
      const parsed = await simpleParser(mimeSource);
      attachments = parsed.attachments.map((a) => ({
        filename: a.filename,
        contentType: a.contentType,
        buffer: a.content,
        size: a.size,
      }));
    }

    // --- Find existing ticket (reply case) ---
    const searchIds = [messageId, inReplyTo, ...references].filter(Boolean);
    let ticket = null;
    if (searchIds.length) {
      ticket = await Ticket.findOne({
        $or: [
          { emailThreadId: { $in: searchIds } },
          { "messages.messageId": { $in: searchIds } },
        ],
      });
    }

    // ================= CASE: REPLY =================
    if (ticket) {
      const sentiment = await analyzeSentimentAI(body);
      const uploaded = await uploadAttachments(attachments, ticket._id);

      ticket.messages.push({
        senderType: "customer",
        externalEmail: fromEmail,
        message: body,
        messageId,
        sentiment,
        attachments: uploaded,
        createdAt: new Date(),
      });

      ticket.lastReplyAt = new Date();
      ticket.lastCustomerReplyAt = new Date();

      if (sentiment === "negative") {
        ticket.priority = "high";
        await Notification.create({
          userId: ticket.agentId,
          type: "NEGATIVE_SENTIMENT",
          ticketId: ticket._id,
          message: "⚠️ Negative sentiment detected",
        });
      }

      await ticket.save();
      return Response.json({ success: true, ticketId: ticket._id });
    }

    // ================= CASE: NEW TICKET =================
    const normalizedToEmail = toEmail.trim().toLowerCase();
    const normalizedFromEmail = fromEmail.trim().toLowerCase();

    const company = await Company.findOne({
      "supportEmails.email": normalizedToEmail,
      "supportEmails.inboundEnabled": true,
    });
    if (!company) return Response.json({ error: "Invalid or disabled mailbox" }, { status: 403 });

   let customer = await Customer.findOne({
  emailId: new RegExp(`^${normalizedFromEmail}$`, "i"),
});

if (!customer) {
  customer = await Customer.create({
    companyId: company._id,
    emailId: normalizedFromEmail,
    name: normalizedFromEmail.split("@")[0],
    source: "email",
  });
}

    const sentiment = await analyzeSentimentAI(body);
    const agentId = await getNextAvailableAgent(customer);

    ticket = await Ticket.create({
      companyId: company._id,
      customerId: customer._id,
      customerEmail: normalizedFromEmail,
      subject,
      source: "email",
      status: "open",
      agentId,
      sentiment,
      priority: sentiment === "negative" ? "high" : "normal",
      emailThreadId: messageId,
      emailAlias: normalizedToEmail,
      messages: [],
      lastCustomerReplyAt: new Date(),
    });

    const uploaded = await uploadAttachments(attachments, ticket._id);

    ticket.messages.push({
      senderType: "customer",
      externalEmail: normalizedFromEmail,
      message: body,
      messageId,
      sentiment,
      attachments: uploaded,
      createdAt: new Date(),
    });

    await ticket.save();

    return Response.json({ success: true, ticketId: ticket._id });
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
// import cloudinary from "@/lib/cloudinary";
// import { simpleParser } from "mailparser"; // Zaroori hai standard emails ke liye

// /* ================= HELPERS ================= */
// /* ================= OUTLOOK NORMALIZATION ================= */

// if (!rawData.from && rawData.sender?.emailAddress?.address) {
//   rawData.from = rawData.sender.emailAddress.address;
// }

// if (!rawData.to && Array.isArray(rawData.toRecipients)) {
//   rawData.to = rawData.toRecipients
//     .map(r => r.emailAddress?.address)
//     .join(", ");
// }


// function extractEmail(v) {
//   const m = String(v || "").match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
//   return m ? m[1].toLowerCase() : "";
// }

// function normalizeId(id) {
//   if (!id) return "";
//   let s = String(id).trim();
//   if (s.startsWith("<") && s.endsWith(">")) s = s.slice(1, -1);
//   return s.replace(/[\r\n\s]+/g, "");
// }

// /* ================= UNIVERSAL ATTACHMENT UPLOADER ================= */

// async function uploadAttachments(rawAttachments, ticketId) {
//   const uploaded = [];
  
//   for (const a of rawAttachments || []) {
//     try {
//       // Data nikaalne ke 2 tarike: content (base64) ya buffer (mailparser)
//       const fileData = a.content || a.buffer;
//       if (!fileData) continue;

//       let uploadStr;
//       if (Buffer.isBuffer(fileData)) {
//         uploadStr = `data:${a.contentType};base64,${fileData.toString("base64")}`;
//       } else {
//         // Agar base64 string hai to check karein prefix hai ya nahi
//         uploadStr = fileData.startsWith("data:") 
//           ? fileData 
//           : `data:${a.contentType};base64,${fileData}`;
//       }

//       const res = await cloudinary.uploader.upload(uploadStr, {
//         folder: `helpdesk/tickets/${ticketId}`,
//         resource_type: "auto",
//       });

//       uploaded.push({
//         filename: a.filename || a.Name || "file",
//         url: res.secure_url,
//         contentType: a.contentType || "application/octet-stream",
//         size: a.size || a.ContentLength || 0,
//       });
//       console.log("✅ Attached:", a.filename || a.Name);
//     } catch (err) {
//       console.error("❌ Cloudinary Error:", err.message);
//     }
//   }
//   return uploaded;
// }

// /* ================= MAIN ================= */

// export async function POST(req) {
//   try {
//     console.log("📨 Parsed Emails:", {
//   fromEmail,
//   toEmail,
//   subject,
// });


//     const { searchParams } = new URL(req.url);
//     if (searchParams.get("secret") !== process.env.INBOUND_EMAIL_SECRET) {
//       return Response.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     await dbConnect();
    
//     // Yahan change: Kai providers text bhejte hain, kai JSON
//     const contentType = req.headers.get("content-type") || "";
//     let rawData;
//     if (contentType.includes("application/json")) {
//       rawData = await req.json();
//     } else {
//       const text = await req.text();
//       try { rawData = JSON.parse(text); } catch { rawData = {}; }
//     }

//     /* --- PARSE ATTACHMENTS (Universal) --- */
//     let attachments = [];
    
//     // 1. Postmark/SendGrid style (JSON Attachments)
//     if (rawData.attachments || rawData.Attachments) {
//       attachments = rawData.attachments || rawData.Attachments;
//     }
    
//     // 2. Outlook/Gmail style (Raw MIME)
//     const mimeSource = rawData.raw || rawData.mime || rawData["body-mime"];
//     if (mimeSource && (!attachments || attachments.length === 0)) {
//       const parsed = await simpleParser(mimeSource);
//       attachments = parsed.attachments.map(a => ({
//         filename: a.filename,
//         contentType: a.contentType,
//         buffer: a.content,
//         size: a.size
//       }));
//     }

//     const fromEmail = extractEmail(rawData.from || rawData.sender || rawData.From);
//     const toEmail = extractEmail(rawData.to || rawData.recipient);
//   const subject = rawData.subject || rawData.Subject || "No Subject";

// const body =
//   rawData.text ||
//   rawData.html ||
//   rawData.body?.content ||
//   "";


//     if (!fromEmail) return Response.json({ error: "Missing sender" }, { status: 400 });

//     const messageId = normalizeId(
//   rawData.messageId ||
//   rawData["Message-ID"] ||
//   rawData.internetMessageId ||
//   `outlook-${Date.now()}`
// );

//     const inReplyTo = normalizeId(rawData.inReplyTo || rawData["In-Reply-To"]);
//     const references = (rawData.references || "").split(/\s+/).map(normalizeId).filter(Boolean);

//     /* --- FIND TICKET --- */
//     const searchIds = [messageId, inReplyTo, ...references].filter(Boolean);
//     let ticket = null;
//     if (searchIds.length) {
//       ticket = await Ticket.findOne({
//         $or: [
//           { emailThreadId: { $in: searchIds } },
//           { "messages.messageId": { $in: searchIds } },
//         ],
//       });
//     }

//     /* ================= CASE: REPLY ================= */
//     if (ticket) {
//       const sentiment = await analyzeSentimentAI(body);
//       const uploaded = await uploadAttachments(attachments, ticket._id);

//       ticket.messages.push({
//         senderType: "customer",
//         externalEmail: fromEmail,
//         message: body,
//         messageId,
//         sentiment,
//         attachments: uploaded,
//         createdAt: new Date(),
//       });

//       ticket.lastReplyAt = new Date();
//       ticket.lastCustomerReplyAt = new Date();
//       if (sentiment === "negative") {
//         ticket.priority = "high";
//         await Notification.create({
//           userId: ticket.agentId,
//           type: "NEGATIVE_SENTIMENT",
//           ticketId: ticket._id,
//           message: "⚠️ Negative sentiment detected",
//         });
//       }

//       await ticket.save();
//       return Response.json({ success: true, ticketId: ticket._id });
//     }

//     /* ================= CASE: NEW TICKET ================= */
// /* ================= CASE: NEW TICKET ================= */

// const normalizedToEmail = toEmail.trim().toLowerCase();
// const normalizedFromEmail = fromEmail.trim().toLowerCase();

// /** ✅ FIX 1: Correct company lookup */
// const company = await Company.findOne({
//   "supportEmails.email": normalizedToEmail,
//   "supportEmails.inboundEnabled": true,
// });

// if (!company) {
//   return Response.json(
//     { error: "Invalid or disabled mailbox" },
//     { status: 403 }
//   );
// }

// /** ✅ Customer lookup (correct already) */
// const customer = await Customer.findOne({
//   emailId: new RegExp(`^${normalizedFromEmail}$`, "i"),
// });

// if (!customer) {
//   return Response.json(
//     { error: "Unknown customer" },
//     { status: 403 }
//   );
// }

// const sentiment = await analyzeSentimentAI(body);
// const agentId = await getNextAvailableAgent(customer);

// /** ✅ Create ticket first */
// ticket = await Ticket.create({
//   companyId: company._id,
//   customerId: customer._id,
//   customerEmail: normalizedFromEmail,
//   subject,
//   source: "email",
//   status: "open",
//   agentId,
//   sentiment,
//   priority: sentiment === "negative" ? "high" : "normal",
//   emailThreadId: messageId || `mail-${Date.now()}`,
//   emailAlias: normalizedToEmail,
//   messages: [],
//   lastCustomerReplyAt: new Date(),
// });

// /** ✅ Upload attachments */
// const uploaded = await uploadAttachments(attachments, ticket._id);

// /** ✅ Push message */
// ticket.messages.push({
//   senderType: "customer",
//   externalEmail: normalizedFromEmail,
//   message: body,
//   messageId,
//   sentiment,
//   attachments: uploaded,
//   createdAt: new Date(),
// });

// await ticket.save();

// return Response.json({
//   success: true,
//   ticketId: ticket._id,
// });
//   } catch (err) {
//     console.error("❌ Inbound error:", err);
//     return Response.json({ error: err.message }, { status: 500 });
//   }
// }


