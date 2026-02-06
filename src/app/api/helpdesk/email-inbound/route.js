export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Customer from "@/models/CustomerModel";
import Company from "@/models/Company";
import Notification from "@/models/helpdesk/Notification";
import { getNextAvailableAgent } from "@/utils/getNextAvailableAgent";
import { analyzeSentimentAI } from "@/utils/aiSentiment";
import cloudinary from "@/lib/cloudinary";

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

/* ================= ATTACHMENTS ================= */

async function uploadAttachments(rawAttachments, ticketId) {
  const uploaded = [];

  for (const a of rawAttachments || []) {
    try {
      const fileData = a.content || a.buffer;
      if (!fileData) continue;

      const uploadStr = Buffer.isBuffer(fileData)
        ? `data:${a.contentType};base64,${fileData.toString("base64")}`
        : fileData;

      const res = await cloudinary.uploader.upload(uploadStr, {
        folder: `helpdesk/tickets/${ticketId}`,
        resource_type: "auto",
      });

      uploaded.push({
        filename: a.name || a.filename || "file",
        url: res.secure_url,
        contentType: a.contentType || "application/octet-stream",
        size: a.size || 0,
      });
    } catch (err) {
      console.error("❌ Attachment upload error:", err.message);
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

    const rawData = await req.json();

    /* ===== Outlook normalize ===== */

    if (!rawData.from && rawData.sender?.emailAddress?.address) {
      rawData.from = rawData.sender.emailAddress.address;
    }

    if (!rawData.to && Array.isArray(rawData.toRecipients)) {
      rawData.to = rawData.toRecipients
        .map((r) => r.emailAddress?.address)
        .join(",");
    }

    const fromEmail = extractEmail(rawData.from);
    const toEmail = extractEmail(rawData.to);
    const subject = rawData.subject || "No Subject";

    let body = rawData.body?.content || "";

    body = body
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<\/?[^>]+(>|$)/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();

    if (!fromEmail) return Response.json({ error: "Missing sender" });

    /* ================= MASTER THREAD ================= */

    const threadId = normalizeId(
      rawData.resourceData?.id ||
      rawData.internetMessageId ||
      `outlook-${Date.now()}`
    );

    const messageId = threadId;

    /* ================= FIND EXISTING ================= */

    let ticket = await Ticket.findOne({ emailThreadId: threadId });

    /* ================= REPLY ================= */

    if (ticket) {
      const sentiment = await analyzeSentimentAI(body);
      const uploaded = await uploadAttachments(rawData.attachments, ticket._id);

      ticket.messages.push({
        senderType: "customer",
        externalEmail: fromEmail,
        message: body,
        messageId,
        sentiment,
        attachments: uploaded,
        createdAt: new Date(),
      });

      ticket.lastCustomerReplyAt = new Date();

      if (sentiment === "negative") {
        ticket.priority = "high";
        await Notification.create({
          userId: ticket.agentId,
          ticketId: ticket._id,
          type: "NEGATIVE_SENTIMENT",
          message: "Negative customer reply",
        });
      }

      await ticket.save();
      return Response.json({ success: true, ticketId: ticket._id });
    }

    /* ================= NEW TICKET ================= */

    const company = await Company.findOne({
      "supportEmails.email": toEmail,
      "supportEmails.inboundEnabled": true,
    });

    if (!company) return Response.json({ error: "Invalid mailbox" });

    const customer = await Customer.findOne({ emailId: fromEmail });
    if (!customer) return Response.json({ error: "Customer not registered" });

    const sentiment = await analyzeSentimentAI(body);
    const agentId = await getNextAvailableAgent(customer);

    ticket = await Ticket.create({
      companyId: company._id,
      customerId: customer._id,
      customerEmail: fromEmail,
      subject,
      source: "email",
      status: "open",
      agentId,
      sentiment,
      priority: sentiment === "negative" ? "high" : "normal",
      emailThreadId: threadId,
      emailAlias: toEmail,
      messages: [],
      lastCustomerReplyAt: new Date(),
    });

    const uploaded = await uploadAttachments(rawData.attachments, ticket._id);

    ticket.messages.push({
      senderType: "customer",
      externalEmail: fromEmail,
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
// import { simpleParser } from "mailparser";

// /* ================= HELPERS ================= */
// function extractEmail(v) {
//   const m = String(v || "").match(
//     /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
//   );
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
//       const fileData = a.content || a.buffer;
//       if (!fileData) continue;

//       let uploadStr;
//       if (Buffer.isBuffer(fileData)) {
//         uploadStr = `data:${a.contentType};base64,${fileData.toString("base64")}`;
//       } else {
//         uploadStr = fileData.startsWith("data:") ? fileData : `data:${a.contentType};base64,${fileData}`;
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
//     } catch (err) {
//       console.error("❌ Cloudinary Error:", err.message);
//     }
//   }

//   return uploaded;
// }

// /* ================= MAIN ================= */
// export async function POST(req) {
//   try {
//     const { searchParams } = new URL(req.url);
//     if (searchParams.get("secret") !== process.env.INBOUND_EMAIL_SECRET) {
//       return Response.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     await dbConnect();

//     // --- Parse rawData ---
//     const contentType = req.headers.get("content-type") || "";
//     let rawData;
//     if (contentType.includes("application/json")) {
//       rawData = await req.json();
//     } else {
//       const text = await req.text();
//       try {
//         rawData = JSON.parse(text);
//       } catch {
//         rawData = {};
//       }
//     }

//     // --- OUTLOOK NORMALIZATION ---
//     if (!rawData.from && rawData.sender?.emailAddress?.address) {
//       rawData.from = rawData.sender.emailAddress.address;
//     }
//     if (!rawData.to && Array.isArray(rawData.toRecipients)) {
//       rawData.to = rawData.toRecipients
//         .map((r) => r.emailAddress?.address)
//         .join(", ");
//     }

//     // --- Extract basic info ---
//     const fromEmail = extractEmail(rawData.from || rawData.sender || rawData.From);
//     const toEmail = extractEmail(rawData.to || rawData.recipient);
//     const subject = rawData.subject || rawData.Subject || "No Subject";
//     let body =
//   rawData.text ||
//   rawData.body?.content ||
//   rawData.html ||
//   "";

// if (body && body.includes("<")) {
//   body = body
//     .replace(/<style[\s\S]*?<\/style>/gi, "")
//     .replace(/<script[\s\S]*?<\/script>/gi, "")
//     .replace(/<\/?[^>]+(>|$)/g, "")
//     .replace(/&nbsp;/g, " ")
//     .trim();
// }



//     if (!fromEmail) return Response.json({ error: "Missing sender" }, { status: 400 });

// const conversationId =
//   rawData.conversationId ||
//   rawData.resourceData?.conversationId ||
//   rawData.resourceData?.id ||
//   "";

// const messageId = normalizeId(
//   rawData.messageId ||
//   rawData["Message-ID"] ||
//   rawData.internetMessageId ||
//   rawData.resourceData?.id ||
//   `outlook-${Date.now()}`
// );



//     const inReplyTo = normalizeId(
//   rawData.inReplyTo ||
//   rawData.conversationId ||
//   rawData["In-Reply-To"]
// );

//     const references = (rawData.references || "").split(/\s+/).map(normalizeId).filter(Boolean);

//     // --- Parse attachments ---
//     let attachments = [];
//     if (rawData.attachments || rawData.Attachments) {
//       attachments = rawData.attachments || rawData.Attachments;
//     }
//     const mimeSource = rawData.raw || rawData.mime || rawData["body-mime"];
//     if (mimeSource && attachments.length === 0) {
//       const parsed = await simpleParser(mimeSource);
//       attachments = parsed.attachments.map((a) => ({
//         filename: a.filename,
//         contentType: a.contentType,
//         buffer: a.content,
//         size: a.size,
//       }));
//     }

//     // --- Find existing ticket (reply case) ---
// const searchIds = [
//   conversationId,
//   inReplyTo,
//   messageId,
//   ...references,
// ].filter(Boolean);



//     let ticket = null;
//     if (searchIds.length) {
//       ticket = await Ticket.findOne({
//         $or: [
//           { emailThreadId: { $in: searchIds } },
//           { "messages.messageId": { $in: searchIds } },
//         ],
//       });
//     }

//     // ================= CASE: REPLY =================
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

//     // ================= CASE: NEW TICKET =================
//     const normalizedToEmail = toEmail.trim().toLowerCase();
//     const normalizedFromEmail = fromEmail.trim().toLowerCase();

//     const company = await Company.findOne({
//       "supportEmails.email": normalizedToEmail,
//       "supportEmails.inboundEnabled": true,
//     });
//     if (!company) return Response.json({ error: "Invalid or disabled mailbox" }, { status: 403 });

//    // ✅ ONLY EXISTING CUSTOMER CAN CREATE TICKET
// const customer = await Customer.findOne({
//   emailId: normalizedFromEmail,
// });

// if (!customer) {
//   console.log("⛔ Unknown customer:", normalizedFromEmail);
//   return Response.json(
//     { success: false, msg: "Customer not registered" },
//     { status: 403 }
//   );
// }


//     const sentiment = await analyzeSentimentAI(body);
//     const agentId = await getNextAvailableAgent(customer);

//     ticket = await Ticket.create({
//       companyId: company._id,
//       customerId: customer._id,
//       customerEmail: normalizedFromEmail,
//       subject,
//       source: "email",
//       status: "open",
//       agentId,
//       sentiment,
//       priority: sentiment === "negative" ? "high" : "normal",
//       emailThreadId: conversationId || messageId,


//       emailAlias: normalizedToEmail,
//       messages: [],
//       lastCustomerReplyAt: new Date(),
//     });

//     const uploaded = await uploadAttachments(attachments, ticket._id);

//     ticket.messages.push({
//       senderType: "customer",
//       externalEmail: normalizedFromEmail,
//       message: body,
//       messageId,
//       sentiment,
//       attachments: uploaded,
//       createdAt: new Date(),
//     });

//     await ticket.save();
//     console.log("FROM:", normalizedFromEmail);
// console.log("TO:", normalizedToEmail);
// console.log("BODY LENGTH:", body.length);

//     return Response.json({ success: true, ticketId: ticket._id });
//   } catch (err) {
//     console.error("❌ Inbound error:", err);
//     return Response.json({ error: err.message }, { status: 500 });
//   }
// }
