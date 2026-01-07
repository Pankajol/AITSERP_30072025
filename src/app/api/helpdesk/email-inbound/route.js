export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Customer from "@/models/CustomerModel";
import Company from "@/models/Company";
import { getNextAvailableAgent } from "@/utils/getNextAvailableAgent";
import { analyzeSentimentAI } from "@/utils/aiSentiment";
import { simpleParser } from "mailparser";
import cloudinary from "@/lib/cloudinary";

/* ================= HELPERS ================= */

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
    return (value.email || value.address || "")
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
  return {};
}

/* ================= ATTACHMENT PARSERS ================= */

function parseAttachments(raw) {
  const files = [];

  if (Array.isArray(raw.Attachments)) {
    for (const a of raw.Attachments) {
      files.push({
        filename: a.Name,
        contentType: a.ContentType,
        size: a.ContentLength,
        content: a.Content,
      });
    }
  }

  if (raw["attachment-info"]) {
    try {
      const info = JSON.parse(raw["attachment-info"]);
      for (const key in info) {
        files.push({
          filename: info[key].filename,
          contentType: info[key].type,
          size: info[key].size,
          content: raw[key],
        });
      }
    } catch {}
  }

  return files;
}

async function parseOutlookAttachments(raw) {
  const source = raw.raw || raw.mime || raw.email;
  if (!source) return [];

  const parsed = await simpleParser(source);
  return (parsed.attachments || []).map(a => ({
    filename: a.filename,
    contentType: a.contentType,
    size: a.size,
    buffer: a.content,
  }));
}

function normalizeAttachments(files = []) {
  return files
    .map(f => {
      if (f.buffer) return f;
      if (f.content) {
        return {
          filename: f.filename,
          contentType: f.contentType,
          size: f.size,
          buffer: Buffer.from(f.content, "base64"),
        };
      }
      return null;
    })
    .filter(Boolean);
}

async function uploadAttachments(files, ticketId) {
  const uploaded = [];

  for (const f of files) {
    const base64 = `data:${f.contentType};base64,${f.buffer.toString("base64")}`;

    const res = await cloudinary.uploader.upload(base64, {
      folder: `helpdesk/tickets/${ticketId}`,
      resource_type: "auto",
    });

    uploaded.push({
      filename: f.filename,
      url: res.secure_url,
      publicId: res.public_id,
      contentType: f.contentType,
      size: f.size,
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
    const raw = await parseBody(req);

    const fromEmail = extractEmail(raw.from || raw.sender);
    const toEmail = extractEmail(raw.to || raw.recipient);
    const subject = raw.subject || "No Subject";
    const body = raw.text || raw.html || "";

    const messageId = normalizeId(raw.messageId || raw["Message-ID"]);
    const inReplyTo = normalizeId(raw.inReplyTo);
    const references = (raw.references || "")
      .split(/\s+/)
      .map(normalizeId)
      .filter(Boolean);

    let attachments = parseAttachments(raw);
    if (!attachments.length) {
      attachments = await parseOutlookAttachments(raw);
    }
    attachments = normalizeAttachments(attachments);

    /* ===== FIND EXISTING TICKET ===== */

    let ticket = await Ticket.findOne({
      $or: [
        { emailThreadId: { $in: [messageId, inReplyTo, ...references] } },
        { "messages.messageId": { $in: [messageId, inReplyTo, ...references] } },
      ],
    });

    /* ===== REPLY ===== */

    if (ticket) {
      const uploaded = attachments.length
        ? await uploadAttachments(attachments, ticket._id)
        : [];

      ticket.messages.push({
        senderType: "customer",
        externalEmail: fromEmail,
        message: body,
        messageId,
        attachments: uploaded,
        createdAt: new Date(),
      });

      ticket.lastCustomerReplyAt = new Date();
      await ticket.save();

      return Response.json({ success: true, ticketId: ticket._id });
    }

    /* ===== NEW TICKET ===== */

    const company = await Company.findOne({ supportEmails: toEmail });
    if (!company) {
      return Response.json({ error: "Invalid mailbox" }, { status: 403 });
    }

    const customer = await Customer.findOne({
      emailId: fromEmail,
      companyId: company._id,
    });
    if (!customer) {
      return Response.json({ error: "Unknown customer" }, { status: 403 });
    }

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
      emailThreadId: messageId,
      emailAlias: toEmail,
      messages: [],
      lastCustomerReplyAt: new Date(),
    });

    const uploaded = attachments.length
      ? await uploadAttachments(attachments, ticket._id)
      : [];

    ticket.messages.push({
      senderType: "customer",
      externalEmail: fromEmail,
      message: body,
      messageId,
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
