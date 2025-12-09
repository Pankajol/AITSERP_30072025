export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";

const SECRET = process.env.INBOUND_EMAIL_SECRET;
const SUPPORT_EMAIL = "pankajal2099@gmail.com"; // jis mail pe tickets aayegi

function extractEmail(value) {
  if (!value) return "";
  if (Array.isArray(value)) value = value[0];
  if (typeof value === "object") {
    return value.email || value.address || value.mail || "";
  }
  const m = (value + "").match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return m ? m[1] : (value + "");
}

async function parseBody(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  // try json first
  try {
    if (ct.includes("application/json")) {
      return await req.json();
    }
    // form urlencoded
    if (ct.includes("application/x-www-form-urlencoded")) {
      const txt = await req.text();
      const params = new URLSearchParams(txt);
      const obj = {};
      for (const [k, v] of params) obj[k] = v;
      return obj;
    }
    // multipart/form-data or other -> try text and try to extract JSON-like or key=val pairs
    const txt = await req.text();
    // try to parse as JSON if it looks like JSON
    const trimmed = txt.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try { return JSON.parse(trimmed); } catch (e) {}
    }
    // as fallback, attempt to parse common key:value lines or key=val pairs
    const obj = {};
    // parse key=value pairs anywhere
    const pairs = trimmed.split(/[\r\n&]+/).map(s => s.trim()).filter(Boolean);
    for (const p of pairs) {
      const parts = p.split("=");
      if (parts.length >= 2) {
        const k = parts.shift().trim();
        const v = parts.join("=").trim();
        obj[k] = v;
      } else if (p.includes(":")) {
        const [k, ...rest] = p.split(":");
        obj[k.trim()] = rest.join(":").trim();
      }
    }
    return obj;
  } catch (err) {
    // as ultimate fallback return empty object
    return {};
  }
}

export async function POST(req) {
  try {
    console.log("📩 EMAIL INBOUND HIT");

    // log headers (useful to check provider + content-type)
    try {
      const headersObj = {};
      for (const [k, v] of req.headers) {
        headersObj[k] = (v + "").slice(0, 200);
      }
      console.log("🧾 RAW HEADERS:", JSON.stringify(headersObj));
    } catch (e) {
      console.log("🧾 RAW HEADERS UNAVAILABLE");
    }

    const { searchParams } = new URL(req.url);
    const secret = (searchParams.get("secret") || "").trim();

    if (!SECRET) {
      console.log("❌ SECRET NOT SET IN ENV");
      return new Response(JSON.stringify({ error: "Server secret missing" }), { status: 500 });
    }

    if (secret !== SECRET) {
      console.log("❌ INVALID SECRET:", secret);
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    await dbConnect();

    const body = await parseBody(req);
    // log a portion of raw body for debugging
    try {
      console.log("🧾 RAW BODY SAMPLE:", JSON.stringify(body).slice(0, 3000));
    } catch (e) {
      console.log("🧾 RAW BODY (couldn't stringify)");
    }

    // ----- Normalize common fields from multiple providers -----
    const raw = body || {};

    const fromEmail =
      extractEmail(raw.fromEmail) ||
      extractEmail(raw.from) ||
      extractEmail(raw.sender) ||
      extractEmail(raw.mail?.source) ||
      extractEmail(raw.envelope?.from) ||
      extractEmail(raw.headers?.from) ||
      extractEmail(raw.From) || "";

    // to may be string, array, object, envelope.to, mail.destination, recipient
    let toRaw = raw.to || raw.recipient || raw.envelope?.to || raw.mail?.destination || raw.headers?.to || raw.To || "";
    if (Array.isArray(toRaw)) {
      toRaw = toRaw.map((t) => (typeof t === "string" ? t : JSON.stringify(t))).join(", ");
    } else if (typeof toRaw === "object") {
      toRaw = extractEmail(toRaw) || JSON.stringify(toRaw);
    }
    const to = String(toRaw || "").trim();

    const subject = raw.subject || raw.mail?.subject || raw.headers?.subject || raw.Subject || "No Subject";
    const text = raw.text || raw.plain || raw.body || raw.message || raw["body-plain"] || "";
    const html = raw.html || raw.htmlBody || raw["body-html"] || "";
    const messageId = (raw.messageId || raw["Message-Id"] || raw["message-id"] || raw.mail?.messageId || "").trim();
    const inReplyTo = (raw.inReplyTo || raw["in-reply-to"] || raw.mail?.inReplyTo || "").trim();

    console.log("🔎 Normalized:", { fromEmail, to: (to || "").slice(0,200), subject, messageId, inReplyTo });

    // Basic validation
    if (!fromEmail) {
      console.log("❌ MISSING fromEmail");
      return new Response(JSON.stringify({ error: "Missing sender email" }), { status: 400 });
    }

    if (!to) {
      console.log("❌ MISSING recipient (to)");
      return new Response(JSON.stringify({ error: "Missing recipient (to)" }), { status: 400 });
    }

    if (!text && !html) {
      console.log("❌ EMPTY BODY (no text/html)");
      return new Response(JSON.stringify({ error: "Empty email body" }), { status: 400 });
    }

    // ✅ Extra Protection: Only allow support email (case-insensitive)
    if (!to.toLowerCase().includes(SUPPORT_EMAIL.toLowerCase())) {
      console.log("❌ NOT SUPPORT EMAIL:", to);
      return new Response(JSON.stringify({ error: "Invalid mailbox" }), { status: 403 });
    }

    // ----- Thread locate with both emailThreadId and messages.messageId search -----
    let ticket = null;
    const searchIds = [];
    if (inReplyTo) searchIds.push(inReplyTo);
    if (messageId) searchIds.push(messageId);

    if (searchIds.length > 0) {
      ticket = await Ticket.findOne({
        $or: [
          { emailThreadId: { $in: searchIds } },
          { "messages.messageId": { $in: searchIds } },
        ],
      }).exec();
    }

    // If nothing found, create new ticket
    if (!ticket) {
      console.log("🆕 Creating new ticket");
      const threadId = messageId || inReplyTo || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
   // before creating a new ticket, ensure no ticket already has the messageId
if (messageId) {
  const existing = await Ticket.findOne({ "messages.messageId": messageId });
  if (existing) {
    console.log("Duplicate messageId — skipping");
    return new Response(JSON.stringify({ success: true, ticketId: existing._id }), { status: 200 });
  }
}

      ticket = await Ticket.create({
        customerEmail: fromEmail,
        subject: subject || "No Subject",
        source: "email",
        status: "open",
        emailThreadId: threadId,
        messages: [],
      });
    }

    // Add message
    const pushMessage = {
      senderType: "customer",
      externalEmail: fromEmail,
      message: text || html,
      messageId: messageId || inReplyTo || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      inReplyTo: inReplyTo || "",
      receivedAt: new Date(),
    };

    ticket.messages.push(pushMessage);
    ticket.lastReplyAt = new Date();
    await ticket.save();

    console.log("✅ TICKET UPDATED:", ticket._id?.toString?.(), " thread:", ticket.emailThreadId);
    return new Response(JSON.stringify({ success: true, ticketId: ticket._id }), { status: 200 });
  } catch (err) {
    console.error("❌ EMAIL INBOUND ERROR:", err?.message || err, err?.stack || "");
    return new Response(JSON.stringify({ error: (err && err.message) || String(err) }), { status: 500 });
  }
}

// TEST ROUTE
export async function GET() {
  return new Response(JSON.stringify({ success: true, message: "Email inbound API is working ✅" }), { status: 200 });
}
