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
    return (value.email || value.address || value.mail || "").toString().toLowerCase();
  }
  const m = String(value).match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return m ? m[1].toLowerCase() : "";
}

async function parseBody(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  if (ct.includes("application/json")) return await req.json();
  const txt = await req.text();
  try { return JSON.parse(txt); } catch { 
    return Object.fromEntries(new URLSearchParams(txt)); 
  }
}

async function uploadAttachmentsToCloudinary(attachments, ticketId) {
  const uploaded = [];
  for (const file of attachments) {
    const buffer = file.buffer || (file.content ? Buffer.from(file.content, 'base64') : null);
    if (!buffer) continue;
    const base64 = `data:${file.contentType};base64,${buffer.toString("base64")}`;
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

/* ===================== MAIN POST ===================== */
export async function POST(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    if (searchParams.get("secret") !== process.env.INBOUND_EMAIL_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await parseBody(req);
    const fromEmail = extractEmail(raw.from || raw.sender || raw["From"]);
    const toEmail = extractEmail(raw.to || raw.recipient);
    const subject = raw.subject || "No Subject";
    const body = raw.text || raw.html || "";
    const messageId = normalizeId(raw.messageId || raw["Message-ID"]);
    const inReplyTo = normalizeId(raw.inReplyTo || raw["In-Reply-To"]);
    const references = (raw.references || "").split(/\s+/).map(normalizeId).filter(Boolean);

    // PARSE ATTACHMENTS (Using mailparser for accuracy)
    let attachments = [];
    const source = raw.raw || raw.mime || raw.email || raw.content;
    if (source) {
      const parsed = await simpleParser(source);
      attachments = (parsed.attachments || []).map(a => ({
        filename: a.filename,
        contentType: a.contentType,
        size: a.size,
        buffer: a.content,
      }));
    }

    // 1. FIND TICKET (Search by Thread IDs)
    const threadIds = [messageId, inReplyTo, ...references].filter(Boolean);
    let ticket = await Ticket.findOne({
      $or: [
        { emailThreadId: { $in: threadIds } },
        { "messages.messageId": { $in: threadIds } }
      ]
    });

    let uploadedFiles = [];
    if (attachments.length) {
      uploadedFiles = await uploadAttachmentsToCloudinary(attachments, ticket?._id || "new");
    }

    const sentiment = await analyzeSentimentAI(body);

    if (ticket) {
      // 2. APPEND REPLY
      const isDuplicate = ticket.messages.some(m => m.messageId === messageId);
      if (isDuplicate) return Response.json({ success: true, msg: "Duplicate" });

      if (ticket.status === "closed") {
        ticket.status = "open";
        ticket.autoClosed = false;
      }

      ticket.messages.push({
        senderType: "customer",
        externalEmail: fromEmail,
        message: body,
        messageId,
        sentiment,
        attachments: uploadedFiles,
        createdAt: new Date(),
      });
      ticket.lastReplyAt = new Date();
      ticket.sentiment = sentiment;
      await ticket.save();
      return Response.json({ success: true, ticketId: ticket._id });
    }

    // 3. CREATE NEW TICKET
    const company = await Company.findOne({ supportEmails: toEmail });
    if (!company) return Response.json({ error: "Invalid mailbox" }, { status: 403 });

    const customer = await Customer.findOne({ emailId: fromEmail, companyId: company._id });
    if (!customer) return Response.json({ error: "Unknown customer" }, { status: 403 });

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
      emailThreadId: messageId,
      messages: [{
        senderType: "customer",
        externalEmail: fromEmail,
        message: body,
        messageId,
        sentiment,
        attachments: uploadedFiles,
        createdAt: new Date(),
      }],
      lastCustomerReplyAt: new Date(),
    });

    return Response.json({ success: true, ticketId: newTicket._id });
  } catch (err) {
    console.error("Inbound Error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}