export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Customer from "@/models/CustomerModel";
import Company from "@/models/Company";
import Notification from "@/models/helpdesk/Notification";
import { getNextAvailableAgent } from "@/utils/getNextAvailableAgent";
import { analyzeSentimentAI } from "@/utils/aiSentiment";
import { simpleParser } from "mailparser";
import cloudinary from "@/lib/cloudinary";

/* ===================== HELPERS ===================== */

function normalizeId(id) {
  if (!id) return "";
  try {
    let s = String(id).trim();
    if (s.startsWith("<") && s.endsWith(">")) s = s.slice(1, -1);
    return s.replace(/[\r\n\s]+/g, "");
  } catch { return ""; }
}

function extractEmail(value) {
  if (!value) return "";
  if (Array.isArray(value)) value = value[0];
  if (typeof value === "object" && value !== null) {
    return (value.email || value.address || value.mail || "").toString().toLowerCase();
  }
  const m = String(value).match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return m ? m[1].toLowerCase() : "";
}

async function parseBody(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  try {
    if (ct.includes("application/json")) return await req.json();
    if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const formData = await req.formData();
      return Object.fromEntries(formData);
    }
    return { body: await req.text() };
  } catch { return {}; }
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 🔥 CLOUDINARY UPLOAD HELPER
async function uploadToCloudinary(buffer, filename, ticketId) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `helpdesk/tickets/${ticketId}`, resource_type: "auto" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

/* ===================== MAIN ===================== */

export async function POST(req) {
  try {
    console.log("📩 INBOUND EMAIL RECEIVED");
    await dbConnect();

    /* ---------- AUTH ---------- */
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    if (!process.env.INBOUND_EMAIL_SECRET || secret !== process.env.INBOUND_EMAIL_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await parseBody(req);
    let fromEmail, toRaw, subject, text, messageId, inReplyTo, references = [];
    let attachmentsToUpload = [];

    /* ---------- 🛡️ ADVANCED PARSING (MAILPARSER) ---------- */
    const emailSource = raw.raw || raw.email || raw.content || raw.body;

    if (emailSource && typeof emailSource === "string" && emailSource.includes("From:")) {
      const parsed = await simpleParser(emailSource);
      fromEmail = extractEmail(parsed.from?.text);
      toRaw = extractEmail(parsed.to?.text);
      subject = parsed.subject;
      text = parsed.text || parsed.html;
      messageId = normalizeId(parsed.messageId);
      inReplyTo = normalizeId(parsed.inReplyTo);
      references = (parsed.references || []).map(normalizeId);

      if (parsed.attachments) {
        attachmentsToUpload = parsed.attachments.map(att => ({
          buffer: att.content,
          filename: att.filename,
          contentType: att.contentType,
          size: att.size
        }));
      }
    } else {
      // Fallback for simple JSON providers
      fromEmail = extractEmail(raw.from || raw.sender);
      toRaw = extractEmail(raw.to || raw.recipient);
      subject = raw.subject || "No Subject";
      text = raw.text || raw.body || "";
      messageId = normalizeId(raw.messageId || raw["Message-ID"]);
      inReplyTo = normalizeId(raw.inReplyTo);
    }

    if (!fromEmail) return Response.json({ error: "Missing sender" }, { status: 400 });

    /* ---------- CUSTOMER & COMPANY CHECK ---------- */
    const customer = await Customer.findOne({
      emailId: { $regex: new RegExp("^" + escapeRegExp(fromEmail) + "$", "i") }
    });

    if (!customer || !customer.companyId) {
      console.log("⛔ Unknown or unlinked customer:", fromEmail);
      return Response.json({ error: "Access denied" }, { status: 403 });
    }

    /* ---------- DUPLICATE PROTECTION ---------- */
    if (messageId) {
      const dup = await Ticket.findOne({ "messages.messageId": messageId }).select("_id");
      if (dup) return Response.json({ success: true, ticketId: dup._id });
    }

    /* ---------- FIND TICKET ---------- */
    const searchIds = [messageId, inReplyTo, ...references].filter(Boolean);
    let ticket = await Ticket.findOne({
      $or: [
        { emailThreadId: { $in: searchIds } },
        { "messages.messageId": { $in: searchIds } }
      ]
    });

    // 🔥 UPLOAD ATTACHMENTS
    let uploadedFiles = [];
    for (const file of attachmentsToUpload) {
      try {
        const res = await uploadToCloudinary(file.buffer, file.filename, ticket?._id || "temp");
        uploadedFiles.push({
          filename: file.filename,
          url: res.secure_url,
          contentType: file.contentType,
          size: file.size
        });
      } catch (e) { console.error("Cloudinary Error:", e); }
    }

    const sentiment = await analyzeSentimentAI(text);

    /* ===================== REPLY CASE ===================== */
    if (ticket) {
      ticket.messages.push({
        senderType: "customer",
        externalEmail: fromEmail,
        message: text,
        messageId,
        sentiment,
        attachments: uploadedFiles,
        createdAt: new Date(),
      });

      if (ticket.status === "closed") ticket.status = "open";
      ticket.sentiment = sentiment;
      ticket.lastCustomerReplyAt = new Date();
      
      if (sentiment === "negative" && ticket.agentId) {
        await Notification.create({
          userId: ticket.agentId,
          type: "NEGATIVE_SENTIMENT",
          ticketId: ticket._id,
          message: "⚠️ Negative sentiment in reply",
        });
        ticket.priority = "high";
      }

      await ticket.save();
      return Response.json({ success: true, ticketId: ticket._id });
    }

    /* ===================== NEW TICKET ===================== */
    const agentId = await getNextAvailableAgent(customer);

    ticket = await Ticket.create({
      companyId: customer.companyId,
      customerId: customer._id,
      customerEmail: fromEmail,
      subject,
      source: "email",
      status: "open",
      agentId,
      sentiment,
      priority: sentiment === "negative" ? "high" : "normal",
      emailThreadId: messageId || `mail-${Date.now()}`,
      messages: [{
        senderType: "customer",
        externalEmail: fromEmail,
        message: text,
        messageId,
        sentiment,
        attachments: uploadedFiles,
        createdAt: new Date(),
      }],
      lastCustomerReplyAt: new Date(),
    });

    if (sentiment === "negative" && agentId) {
      await Notification.create({
        userId: agentId,
        type: "NEGATIVE_SENTIMENT",
        ticketId: ticket._id,
        message: "⚠️ Negative sentiment in new ticket",
      });
    }

    return Response.json({ success: true, ticketId: ticket._id });

  } catch (err) {
    console.error("❌ Inbound error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}