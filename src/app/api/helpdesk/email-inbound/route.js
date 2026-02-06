export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Customer from "@/models/CustomerModel";
import Company from "@/models/Company";
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
  return String(id).replace(/[\r\n\s<>]+/g, "");
}

/* ================= ATTACHMENTS ================= */
async function uploadAttachments(rawAttachments, ticketId) {
  const uploaded = [];

  for (const a of rawAttachments || []) {
    const uploadStr = `data:${a.contentType};base64,${a.content}`;
    const res = await cloudinary.uploader.upload(uploadStr, {
      folder: `helpdesk/tickets/${ticketId}`,
      resource_type: "auto",
    });

    uploaded.push({
      filename: a.filename,
      url: res.secure_url,
      contentType: a.contentType,
      size: a.size,
    });
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

    const fromEmail = extractEmail(rawData.from);
    const toEmail = extractEmail(rawData.to);
    const body = rawData.html || "";

    const conversationId = normalizeId(rawData.conversationId);

    console.log("🧵 INBOUND conversationId:", conversationId);

    if (!conversationId) {
      return Response.json({ error: "conversationId missing" }, { status: 400 });
    }

    let ticket = await Ticket.findOne({
      emailThreadId: conversationId,
    });

    if (ticket) {
      ticket.messages.push({
        senderType: "customer",
        externalEmail: fromEmail,
        message: body.replace(/<\/?[^>]+>/g, "").trim(),
        messageId: rawData.messageId || "",
        createdAt: new Date(),
      });

      ticket.lastCustomerReplyAt = new Date();
      await ticket.save();

      console.log("✅ APPENDED TO EXISTING");

      return Response.json({ success: true, ticketId: ticket._id });
    }

    const company = await Company.findOne({
      "supportEmails.email": toEmail,
      "supportEmails.inboundEnabled": true,
    });

    if (!company) return Response.json({ error: "Mailbox invalid" }, { status: 403 });

    const customer = await Customer.findOne({ emailId: fromEmail });
    if (!customer)
      return Response.json({ error: "Customer not registered" }, { status: 403 });

    ticket = await Ticket.create({
      companyId: company._id,
      customerId: customer._id,
      customerEmail: fromEmail,
      subject: rawData.subject || "No Subject",
      status: "open",
      source: "email",
      emailThreadId: conversationId,
      emailAlias: toEmail,
      messages: [],
    });

    ticket.messages.push({
      senderType: "customer",
      externalEmail: fromEmail,
      message: body.replace(/<\/?[^>]+>/g, "").trim(),
      messageId: rawData.messageId || "",
      createdAt: new Date(),
    });

    await ticket.save();

    console.log("🆕 NEW TICKET CREATED");

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
//   return String(id).replace(/[<>\r\n\s]+/g, "").trim();
// }

// /* ================= ATTACHMENTS ================= */

// async function uploadAttachments(rawAttachments, ticketId) {
//   const uploaded = [];

//   for (const a of rawAttachments || []) {
//     try {
//       const fileData = a.content || a.buffer;
//       if (!fileData) continue;

//       const uploadStr = Buffer.isBuffer(fileData)
//         ? `data:${a.contentType};base64,${fileData.toString("base64")}`
//         : `data:${a.contentType};base64,${fileData}`;

//       const res = await cloudinary.uploader.upload(uploadStr, {
//         folder: `helpdesk/tickets/${ticketId}`,
//         resource_type: "auto",
//       });

//       uploaded.push({
//         filename: a.filename || "file",
//         url: res.secure_url,
//         contentType: a.contentType,
//         size: a.size || 0,
//       });
//     } catch (e) {
//       console.error("❌ Attachment upload failed:", e.message);
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

//     const rawData = await req.json();

//     /* ===== Extract ===== */

//     const fromEmail = extractEmail(rawData.from);
//     const toEmail = extractEmail(rawData.to);
//     const subject = rawData.subject || "No Subject";

//     let body = rawData.text || rawData.html || "";

//     if (body.includes("<")) {
//       body = body
//         .replace(/<style[\s\S]*?<\/style>/gi, "")
//         .replace(/<script[\s\S]*?<\/script>/gi, "")
//         .replace(/<\/?[^>]+>/g, "")
//         .replace(/&nbsp;/g, " ")
//         .trim();
//     }

//     if (!fromEmail) {
//       return Response.json({ error: "Missing sender" }, { status: 400 });
//     }

//     /* ===== ONLY conversationId ===== */
// const threadId = normalizeId(rawData.conversationId);

// if (!threadId) {
//   console.log("❌ Missing conversationId payload:", rawData);
//   return Response.json({ error: "conversationId missing" }, { status: 400 });
// }


//     const messageId = normalizeId(rawData.messageId || `outlook-${Date.now()}`);

//     console.log("THREAD:", threadId);

//     /* ===== Attachments ===== */

//     let attachments = rawData.attachments || [];

//     if (!attachments.length && rawData.raw) {
//       const parsed = await simpleParser(rawData.raw);
//       attachments = parsed.attachments.map((a) => ({
//         filename: a.filename,
//         contentType: a.contentType,
//         buffer: a.content,
//         size: a.size,
//       }));
//     }

//     /* ===== Try existing ticket ===== */

//     let ticket = await Ticket.findOne({ emailThreadId: threadId });

//     /* ================= REPLY ================= */

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

//       ticket.lastCustomerReplyAt = new Date();

//       if (sentiment === "negative") {
//         ticket.priority = "high";
//         await Notification.create({
//           userId: ticket.agentId,
//           type: "NEGATIVE_SENTIMENT",
//           ticketId: ticket._id,
//           message: "Negative sentiment detected",
//         });
//       }

//       await ticket.save();
//       console.log("✅ Reply appended");

//       return Response.json({ success: true, ticketId: ticket._id });
//     }

//     /* ================= NEW TICKET ================= */

//     const company = await Company.findOne({
//       "supportEmails.email": toEmail,
//       "supportEmails.inboundEnabled": true,
//     });

//     if (!company) {
//       return Response.json({ error: "Mailbox not found" }, { status: 403 });
//     }

//     const customer = await Customer.findOne({ emailId: fromEmail });

//     if (!customer) {
//       return Response.json({ error: "Customer not registered" }, { status: 403 });
//     }

//     const sentiment = await analyzeSentimentAI(body);
//     const agentId = await getNextAvailableAgent(customer);

//     ticket = await Ticket.create({
//       companyId: company._id,
//       customerId: customer._id,
//       customerEmail: fromEmail,
//       subject,
//       source: "email",
//       status: "open",
//       agentId,
//       sentiment,
//       priority: sentiment === "negative" ? "high" : "normal",
//       emailThreadId: threadId,
//       emailAlias: toEmail,
//       messages: [],
//       lastCustomerReplyAt: new Date(),
//     });

//     const uploaded = await uploadAttachments(attachments, ticket._id);

//     ticket.messages.push({
//       senderType: "customer",
//       externalEmail: fromEmail,
//       message: body,
//       messageId,
//       sentiment,
//       attachments: uploaded,
//       createdAt: new Date(),
//     });

//     await ticket.save();

//     console.log("✅ New ticket created");

//     return Response.json({ success: true, ticketId: ticket._id });
//   } catch (err) {
//     console.error("❌ Inbound error:", err);
//     return Response.json({ error: err.message }, { status: 500 });
//   }
// }



