



export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Customer from "@/models/CustomerModel";
import Company from "@/models/Company";
import { getNextAvailableAgent } from "@/utils/getNextAvailableAgent";
import { analyzeSentimentAI } from "@/utils/aiSentiment";
import { simpleParser } from "mailparser";
import cloudinary from "@/lib/cloudinary";


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

  /* ================= POSTMARK ================= */
  if (Array.isArray(raw.Attachments)) {
    for (const a of raw.Attachments) {
      files.push({
        filename: a.Name,
        contentType: a.ContentType,
        size: a.ContentLength,
        content: a.Content, // base64
      });
    }
  }

  /* ================= SENDGRID ================= */
  if (raw["attachment-info"]) {
    try {
      const info = JSON.parse(raw["attachment-info"]);
      for (const key in info) {
        const meta = info[key];
        const file = raw[key];

        if (file) {
          files.push({
            filename: meta.filename,
            contentType: meta.type,
            size: meta.size,
            content: file, // base64
          });
        }
      }
    } catch (e) {
      console.log("❌ attachment-info parse failed");
    }
  }

  /* ================= MAILGUN ================= */
  if (raw["attachment-count"]) {
    const count = Number(raw["attachment-count"]);
    for (let i = 1; i <= count; i++) {
      const a = raw[`attachment-${i}`];
      if (a) {
        files.push({
          filename: a.filename,
          contentType: a.contentType,
          size: a.size,
          content: a.data || null,
        });
      }
    }
  }

  return files;
}


async function parseOutlookAttachments(raw) {
  const source =
    raw.raw || raw.mime || raw.email || raw.content || null;

  if (!source) return [];

  const parsed = await simpleParser(source);

  return (parsed.attachments || []).map(a => ({
    filename: a.filename,
    contentType: a.contentType,
    size: a.size,
    buffer: a.content, // Buffer
  }));
}


async function uploadAttachmentsToCloudinary(attachments, ticketId) {
  const uploaded = [];

  for (const file of attachments) {
    if (!file.buffer) continue;

    const base64 = `data:${file.contentType};base64,${file.buffer.toString(
      "base64"
    )}`;

    const res = await cloudinary.uploader.upload(base64, {
      folder: `helpdesk/tickets/${ticketId}`,
      resource_type: "auto",
    });

    uploaded.push({
      filename: file.filename,
      url: res.secure_url,
      publicId: res.public_id,
      contentType: file.contentType,
      size: file.size,
    });
  }

  return uploaded;
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

let attachments = parseAttachments(raw);

if (!attachments.length) {
  attachments = await parseOutlookAttachments(raw);
}

let uploadedAttachments = [];

if (attachments.length) {
  uploadedAttachments = await uploadAttachmentsToCloudinary(
    attachments,
    "temp"
  );
}



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

  /* 🔥 AUTO REOPEN LOGIC */
  let reopened = false;
  if (ticket.status === "closed") {
    ticket.status = "open";
    ticket.autoClosed = false;
    reopened = true;
  }

  ticket.messages.push({
    senderType: "customer",
    externalEmail: fromEmail,
    message: body,
    messageId,
    sentiment,
    attachments: uploadedAttachments,
    createdAt: new Date(),
  });

  ticket.lastReplyAt = new Date();
  ticket.lastCustomerReplyAt = new Date();
  ticket.sentiment = sentiment;

  await ticket.save();

  console.log(
    reopened
      ? "🔓 Ticket reopened by customer email"
      : "🔁 Reply appended with attachments"
  );

  return Response.json({
    success: true,
    ticketId: ticket._id,
    reopened,
  });
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
           attachments: uploadedAttachments,
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



