export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Customer from "@/models/CustomerModel";
import Company from "@/models/Company";
import Notification from "@/models/helpdesk/Notification";
import { getNextAvailableAgent } from "@/utils/getNextAvailableAgent";
import { analyzeSentimentAI } from "@/utils/aiSentiment";
import cloudinary from "@/lib/cloudinary";
import { simpleParser } from "mailparser"; // Zaroori hai standard emails ke liye

/* ================= HELPERS ================= */

function extractEmail(v) {
  const m = String(v || "").match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
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
      // Data nikaalne ke 2 tarike: content (base64) ya buffer (mailparser)
      const fileData = a.content || a.buffer;
      if (!fileData) continue;

      let uploadStr;
      if (Buffer.isBuffer(fileData)) {
        uploadStr = `data:${a.contentType};base64,${fileData.toString("base64")}`;
      } else {
        // Agar base64 string hai to check karein prefix hai ya nahi
        uploadStr = fileData.startsWith("data:") 
          ? fileData 
          : `data:${a.contentType};base64,${fileData}`;
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
      console.log("✅ Attached:", a.filename || a.Name);
    } catch (err) {
      console.error("❌ Cloudinary Error:", err.message);
    }
  }
  return uploaded;
}

/* ================= MAIN ================= */

export async function POST(req) {
  try {
    console.log("📩 INBOUND EMAIL RECEIVED");

    const { searchParams } = new URL(req.url);
    if (searchParams.get("secret") !== process.env.INBOUND_EMAIL_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    
    // Yahan change: Kai providers text bhejte hain, kai JSON
    const contentType = req.headers.get("content-type") || "";
    let rawData;
    if (contentType.includes("application/json")) {
      rawData = await req.json();
    } else {
      const text = await req.text();
      try { rawData = JSON.parse(text); } catch { rawData = {}; }
    }

    /* --- PARSE ATTACHMENTS (Universal) --- */
    let attachments = [];
    
    // 1. Postmark/SendGrid style (JSON Attachments)
    if (rawData.attachments || rawData.Attachments) {
      attachments = rawData.attachments || rawData.Attachments;
    }
    
    // 2. Outlook/Gmail style (Raw MIME)
    const mimeSource = rawData.raw || rawData.mime || rawData["body-mime"];
    if (mimeSource && (!attachments || attachments.length === 0)) {
      const parsed = await simpleParser(mimeSource);
      attachments = parsed.attachments.map(a => ({
        filename: a.filename,
        contentType: a.contentType,
        buffer: a.content,
        size: a.size
      }));
    }

    const fromEmail = extractEmail(rawData.from || rawData.sender || rawData.From);
    const toEmail = extractEmail(rawData.to || rawData.recipient);
    const subject = rawData.subject || "No Subject";
    const body = rawData.text || rawData.html || "";

    if (!fromEmail) return Response.json({ error: "Missing sender" }, { status: 400 });

    const messageId = normalizeId(rawData.messageId || rawData["Message-ID"]);
    const inReplyTo = normalizeId(rawData.inReplyTo || rawData["In-Reply-To"]);
    const references = (rawData.references || "").split(/\s+/).map(normalizeId).filter(Boolean);

    /* --- FIND TICKET --- */
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

    /* ================= CASE: REPLY ================= */
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

    /* ================= CASE: NEW TICKET ================= */
    const company = await Company.findOne({ supportEmails: toEmail });
    if (!company) return Response.json({ error: "Invalid mailbox" }, { status: 403 });

    const customer = await Customer.findOne({ emailId: new RegExp(`^${fromEmail}$`, "i") });
    if (!customer) return Response.json({ error: "Unknown customer" }, { status: 403 });

    const sentiment = await analyzeSentimentAI(body);
    const agentId = await getNextAvailableAgent(customer);

    // Pehle Ticket create karein taaki ID mil jaye
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
      emailThreadId: messageId || `mail-${Date.now()}`,
      emailAlias: toEmail,
      messages: [],
      lastCustomerReplyAt: new Date(),
    });

    // Upload files
    const uploaded = await uploadAttachments(attachments, ticket._id);

    // Message push karein
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
// import { getNextAvailableAgent } from "@/utils/getNextAvailableAgent";
// import { analyzeSentimentAI } from "@/utils/aiSentiment";
// import { simpleParser } from "mailparser";
// import cloudinary from "@/lib/cloudinary";


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

// /* ===================== ATTACHMENT PARSER ===================== */

// function parseAttachments(raw) {
//   const files = [];

//   /* ================= POSTMARK ================= */
//   if (Array.isArray(raw.Attachments)) {
//     for (const a of raw.Attachments) {
//       files.push({
//         filename: a.Name,
//         contentType: a.ContentType,
//         size: a.ContentLength,
//         content: a.Content, // base64
//       });
//     }
//   }

//   /* ================= SENDGRID ================= */
//   if (raw["attachment-info"]) {
//     try {
//       const info = JSON.parse(raw["attachment-info"]);
//       for (const key in info) {
//         const meta = info[key];
//         const file = raw[key];

//         if (file) {
//           files.push({
//             filename: meta.filename,
//             contentType: meta.type,
//             size: meta.size,
//             content: file, // base64
//           });
//         }
//       }
//     } catch (e) {
//       console.log("❌ attachment-info parse failed");
//     }
//   }

//   /* ================= MAILGUN ================= */
//   if (raw["attachment-count"]) {
//     const count = Number(raw["attachment-count"]);
//     for (let i = 1; i <= count; i++) {
//       const a = raw[`attachment-${i}`];
//       if (a) {
//         files.push({
//           filename: a.filename,
//           contentType: a.contentType,
//           size: a.size,
//           content: a.data || null,
//         });
//       }
//     }
//   }

//   return files;
// }


// async function parseOutlookAttachments(raw) {
//   const source =
//     raw.raw || raw.mime || raw.email || raw.content || null;

//   if (!source) return [];

//   const parsed = await simpleParser(source);

//   return (parsed.attachments || []).map(a => ({
//     filename: a.filename,
//     contentType: a.contentType,
//     size: a.size,
//     buffer: a.content, // Buffer
//   }));
// }


// async function uploadAttachmentsToCloudinary(attachments, ticketId) {
//   const uploaded = [];

//   for (const file of attachments) {
//     if (!file.buffer) continue;

//     const base64 = `data:${file.contentType};base64,${file.buffer.toString(
//       "base64"
//     )}`;

//     const res = await cloudinary.uploader.upload(base64, {
//       folder: `helpdesk/tickets/${ticketId}`,
//       resource_type: "auto",
//     });

//     uploaded.push({
//       filename: file.filename,
//       url: res.secure_url,
//       publicId: res.public_id,
//       contentType: file.contentType,
//       size: file.size,
//     });
//   }

//   return uploaded;
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
//     const inReplyTo = normalizeId(raw.inReplyTo || raw["In-Reply-To"]);
//     const references = (raw.references || "")
//       .split(/\s+/)
//       .map(normalizeId)
//       .filter(Boolean);

// let attachments = parseAttachments(raw);

// if (!attachments.length) {
//   attachments = await parseOutlookAttachments(raw);
// }

// let uploadedAttachments = [];

// if (attachments.length) {
//   uploadedAttachments = await uploadAttachmentsToCloudinary(
//     attachments,
//     "temp"
//   );
// }



//     console.log("📨 Incoming TO:", toEmail);
//     console.log("📎 Attachments:", attachments.length);

//     /* =====================================================
//        1️⃣ FIND EXISTING TICKET (REPLY)
//     ===================================================== */

//     const ticket =
//       (await Ticket.findOne({
//         $or: [
//           { emailThreadId: { $in: [messageId, inReplyTo, ...references] } },
//           { "messages.messageId": { $in: [messageId, inReplyTo, ...references] } },
//         ],
//       })) || null;

//     /* ---------- DUPLICATE ---------- */
//     if (ticket && messageId) {
//       const exists = ticket.messages.find(m => m.messageId === messageId);
//       if (exists) {
//         console.log("♻️ Duplicate email ignored");
//         return Response.json({ success: true, ticketId: ticket._id });
//       }
//     }

//     /* =====================================================
//        2️⃣ REPLY → APPEND MESSAGE
//     ===================================================== */

//    if (ticket) {
//   const sentiment = await analyzeSentimentAI(body);

//   /* 🔥 AUTO REOPEN LOGIC */
//   let reopened = false;
//   if (ticket.status === "closed") {
//     ticket.status = "open";
//     ticket.autoClosed = false;
//     reopened = true;
//   }

//   ticket.messages.push({
//     senderType: "customer",
//     externalEmail: fromEmail,
//     message: body,
//     messageId,
//     sentiment,
//     attachments: uploadedAttachments,
//     createdAt: new Date(),
//   });

//   ticket.lastReplyAt = new Date();
//   ticket.lastCustomerReplyAt = new Date();
//   ticket.sentiment = sentiment;

//   await ticket.save();

//   console.log(
//     reopened
//       ? "🔓 Ticket reopened by customer email"
//       : "🔁 Reply appended with attachments"
//   );

//   return Response.json({
//     success: true,
//     ticketId: ticket._id,
//     reopened,
//   });
// }

//     /* =====================================================
//        3️⃣ NEW EMAIL → COMPANY
//     ===================================================== */

//     const company = await Company.findOne({
//       supportEmails: toEmail,
//     }).select("_id companyName");

//     if (!company) {
//       console.log("⛔ Invalid mailbox");
//       return Response.json({ error: "Invalid mailbox" }, { status: 403 });
//     }

//     /* =====================================================
//        4️⃣ CUSTOMER
//     ===================================================== */

//     const customer = await Customer.findOne({
//       emailId: { $regex: new RegExp("^" + escapeRegExp(fromEmail) + "$", "i") },
//       companyId: company._id,
//     });

//     if (!customer) {
//       console.log("⛔ Unknown customer:", fromEmail);
//       return Response.json({ error: "Unknown customer" }, { status: 403 });
//     }

//     /* =====================================================
//        5️⃣ CREATE TICKET
//     ===================================================== */

//     const sentiment = await analyzeSentimentAI(body);
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
//       emailAlias: toEmail,

//       messages: [
//         {
//           senderType: "customer",
//           externalEmail: fromEmail,
//           message: body,
//           messageId,
//           sentiment,
//            attachments: uploadedAttachments,
//           createdAt: new Date(),
//         },
//       ],

//       lastCustomerReplyAt: new Date(),
//     });

//     console.log("🎯 New ticket created with attachments:", newTicket._id);

//     return Response.json({ success: true, ticketId: newTicket._id });
//   } catch (err) {
//     console.error("❌ Inbound error:", err);
//     return Response.json({ error: err.message }, { status: 500 });
//   }
// }



