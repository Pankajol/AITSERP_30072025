// app/api/mail/inbound/route.js
export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";

const FALLBACK_SUPPORT_EMAIL = "pankajal2099@gmail.com";

function extractEmail(value) {
  if (!value) return "";
  if (Array.isArray(value)) value = value[0];
  if (typeof value === "object") return (value.email || value.address || value.mail || "").toString();
  try {
    const str = String(value);
    const m = str.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    return m ? m[1] : str.trim();
  } catch (e) { return ""; }
}

function normalizeId(id) {
  if (!id) return "";
  return String(id).trim().replace(/^\s*<|>\s*$/g, "");
}

async function parseBody(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  try {
    if (ct.includes("application/json")) return await req.json();
    if (ct.includes("application/x-www-form-urlencoded")) {
      const txt = await req.text();
      const params = new URLSearchParams(txt);
      const obj = {};
      for (const [k, v] of params) obj[k] = v;
      return obj;
    }
    const txt = await req.text();
    const trimmed = txt.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try { return JSON.parse(trimmed); } catch (e) {}
    }
    const obj = {};
    const lines = trimmed.split(/\r\n|\n|\r/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (line.includes("=")) {
        const [k, ...rest] = line.split("=");
        obj[k.trim()] = rest.join("=").trim();
        continue;
      }
      if (line.includes(":")) {
        const [k, ...rest] = line.split(":");
        obj[k.trim()] = rest.join(":").trim();
        continue;
      }
      if (!obj.body) obj.body = line; else obj.body += "\n" + line;
    }
    return obj;
  } catch (err) {
    return {};
  }
}

export async function POST(req) {
  try {
    console.log("📩 INBOUND EMAIL HANDLER HIT");
    const { searchParams } = new URL(req.url);
    const secret = (searchParams.get("secret") || "").trim();
    const SECRET = process.env.INBOUND_EMAIL_SECRET;
    if (!SECRET) {
      console.error("INBOUND_EMAIL_SECRET not set");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 500 });
    }
    if (secret !== SECRET) {
      console.warn("Invalid inbound secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    await dbConnect();
    const raw = await parseBody(req);

    const fromEmail = extractEmail(raw.from || raw.fromEmail || raw.sender || raw["From"] || raw.headers?.from || "");
    let toRaw = raw.to || raw.recipient || raw.envelope?.to || raw.mail?.destination || raw.headers?.to || raw["To"] || "";
    if (Array.isArray(toRaw)) toRaw = toRaw.map(t => (typeof t === "string" ? t : JSON.stringify(t))).join(", ");
    else if (typeof toRaw === "object" && toRaw !== null) toRaw = extractEmail(toRaw) || JSON.stringify(toRaw);
    const to = String(toRaw || "").trim();

    const subject = raw.subject || raw.mail?.subject || raw.headers?.subject || "No Subject";
    const text = raw.text || raw.plain || raw.body || raw.message || raw["body-plain"] || raw["text"] || "";
    const html = raw.html || raw.htmlBody || raw["body-html"] || "";

    const messageId = normalizeId(raw.messageId || raw["Message-Id"] || raw["message-id"] || raw.mail?.messageId || raw.headers?.["message-id"] || "");
    const inReplyTo = normalizeId(raw.inReplyTo || raw["in-reply-to"] || raw.mail?.inReplyTo || raw.headers?.["in-reply-to"] || "");
    const referencesRaw = raw.references || raw["References"] || raw.headers?.references || raw.headers?.References || "";
    const references = (referencesRaw || "").toString().split(/\s+/).map(normalizeId).filter(Boolean);

    console.log("Normalized inbound:", { fromEmail, to: (to||"").slice(0,200), subject: subject.slice(0,200), messageId, inReplyTo, references });

    if (!fromEmail) return new Response(JSON.stringify({ error: "Missing sender email" }), { status: 400 });
    if (!to) return new Response(JSON.stringify({ error: "Missing recipient (to)" }), { status: 400 });
    if (!text && !html) return new Response(JSON.stringify({ error: "Empty email body" }), { status: 400 });

    const SUPPORT_EMAIL = (process.env.SUPPORT_EMAIL || FALLBACK_SUPPORT_EMAIL).toLowerCase();
    const smtpUser = (process.env.SMTP_USER || "").toLowerCase();
    if (!to.toLowerCase().includes(SUPPORT_EMAIL)) {
      console.warn("Email received to non-support mailbox:", to);
      return new Response(JSON.stringify({ error: "Invalid mailbox" }), { status: 403 });
    }

    // Prevent loops: ignore mail coming from our smtp user
    if (smtpUser && fromEmail.toLowerCase().includes(smtpUser)) {
      console.log("Ignored inbound from SMTP_USER (likely loop).");
      return new Response(JSON.stringify({ success: true, ignored: true }), { status: 200 });
    }

    // Try match ticket by In-Reply-To / Message-ID / References / lastOutbound
    let ticket = null;
    const searchIds = [];
    if (inReplyTo) searchIds.push(inReplyTo);
    if (messageId) searchIds.push(messageId);
    for (const r of references) if (r) searchIds.push(r);

    if (searchIds.length > 0) {
      ticket = await Ticket.findOne({
        $or: [
          { emailThreadId: { $in: searchIds } },
          { "messages.messageId": { $in: searchIds } },
          { "lastOutbound.messageId": { $in: searchIds } },
        ],
      }).exec();
    }

    // subject-based fallback (if you include ticket id in subject)
    if (!ticket && subject) {
      const match = subject.match(/([a-f0-9]{24})/i);
      if (match) {
        try { ticket = await Ticket.findById(match[1]).exec(); } catch (e) {}
      }
    }

    // Duplicate check
    if (messageId) {
      const dup = await Ticket.findOne({ "messages.messageId": messageId }).select("_id").lean().exec();
      if (dup) {
        console.log("Duplicate messageId processed earlier. Skipping.");
        return new Response(JSON.stringify({ success: true, duplicate: true, ticketId: dup._id }), { status: 200 });
      }
    }

    if (!ticket) {
      // create new ticket
      console.log("No ticket found — creating new ticket for:", fromEmail);
      const threadId = messageId || inReplyTo || `local-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
      ticket = await Ticket.create({
        customerEmail: fromEmail,
        subject: subject || "No Subject",
        source: "email",
        status: "open",
        emailThreadId: threadId,
        messages: [],
        createdAt: new Date(),
      });
    }

    // append message
    const pushMessage = {
      sender: null,
      senderType: "customer",
      externalEmail: fromEmail,
      message: text || html || "(no content)",
      messageId: messageId || inReplyTo || `msg-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      inReplyTo: inReplyTo || "",
      createdAt: new Date(),
    };

    ticket.messages.push(pushMessage);
    ticket.lastReplyAt = new Date();
    if (!ticket.emailThreadId && (messageId || inReplyTo)) ticket.emailThreadId = messageId || inReplyTo;
    await ticket.save();

    console.log("Appended message to ticket:", ticket._id?.toString());
    return new Response(JSON.stringify({ success: true, ticketId: ticket._id }), { status: 200 });
  } catch (err) {
    console.error("Inbound handler error:", err);
    return new Response(JSON.stringify({ error: (err && err.message) || String(err) }), { status: 500 });
  }
}

// health
export async function GET() {
  return new Response(JSON.stringify({ success: true, message: "Inbound endpoint ok" }), { status: 200 });
}



// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";

// const SECRET = process.env.INBOUND_EMAIL_SECRET;
// const SUPPORT_EMAIL = "pankajal2099@gmail.com"; // jis mail pe tickets aayegi

// function extractEmail(value) {
//   if (!value) return "";
//   if (Array.isArray(value)) value = value[0];
//   if (typeof value === "object") {
//     return value.email || value.address || value.mail || "";
//   }
//   const m = (value + "").match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
//   return m ? m[1] : (value + "");
// }

// async function parseBody(req) {
//   const ct = (req.headers.get("content-type") || "").toLowerCase();
//   // try json first
//   try {
//     if (ct.includes("application/json")) {
//       return await req.json();
//     }
//     // form urlencoded
//     if (ct.includes("application/x-www-form-urlencoded")) {
//       const txt = await req.text();
//       const params = new URLSearchParams(txt);
//       const obj = {};
//       for (const [k, v] of params) obj[k] = v;
//       return obj;
//     }
//     // multipart/form-data or other -> try text and try to extract JSON-like or key=val pairs
//     const txt = await req.text();
//     // try to parse as JSON if it looks like JSON
//     const trimmed = txt.trim();
//     if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
//       try { return JSON.parse(trimmed); } catch (e) {}
//     }
//     // as fallback, attempt to parse common key:value lines or key=val pairs
//     const obj = {};
//     // parse key=value pairs anywhere
//     const pairs = trimmed.split(/[\r\n&]+/).map(s => s.trim()).filter(Boolean);
//     for (const p of pairs) {
//       const parts = p.split("=");
//       if (parts.length >= 2) {
//         const k = parts.shift().trim();
//         const v = parts.join("=").trim();
//         obj[k] = v;
//       } else if (p.includes(":")) {
//         const [k, ...rest] = p.split(":");
//         obj[k.trim()] = rest.join(":").trim();
//       }
//     }
//     return obj;
//   } catch (err) {
//     // as ultimate fallback return empty object
//     return {};
//   }
// }

// export async function POST(req) {
//   try {
//     console.log("📩 EMAIL INBOUND HIT");

//     // log headers (useful to check provider + content-type)
//     try {
//       const headersObj = {};
//       for (const [k, v] of req.headers) {
//         headersObj[k] = (v + "").slice(0, 200);
//       }
//       console.log("🧾 RAW HEADERS:", JSON.stringify(headersObj));
//     } catch (e) {
//       console.log("🧾 RAW HEADERS UNAVAILABLE");
//     }

//     const { searchParams } = new URL(req.url);
//     const secret = (searchParams.get("secret") || "").trim();

//     if (!SECRET) {
//       console.log("❌ SECRET NOT SET IN ENV");
//       return new Response(JSON.stringify({ error: "Server secret missing" }), { status: 500 });
//     }

//     if (secret !== SECRET) {
//       console.log("❌ INVALID SECRET:", secret);
//       return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
//     }

//     await dbConnect();

//     const body = await parseBody(req);
//     // log a portion of raw body for debugging
//     try {
//       console.log("🧾 RAW BODY SAMPLE:", JSON.stringify(body).slice(0, 3000));
//     } catch (e) {
//       console.log("🧾 RAW BODY (couldn't stringify)");
//     }

//     // ----- Normalize common fields from multiple providers -----
//     const raw = body || {};

//     const fromEmail =
//       extractEmail(raw.fromEmail) ||
//       extractEmail(raw.from) ||
//       extractEmail(raw.sender) ||
//       extractEmail(raw.mail?.source) ||
//       extractEmail(raw.envelope?.from) ||
//       extractEmail(raw.headers?.from) ||
//       extractEmail(raw.From) || "";

//     // to may be string, array, object, envelope.to, mail.destination, recipient
//     let toRaw = raw.to || raw.recipient || raw.envelope?.to || raw.mail?.destination || raw.headers?.to || raw.To || "";
//     if (Array.isArray(toRaw)) {
//       toRaw = toRaw.map((t) => (typeof t === "string" ? t : JSON.stringify(t))).join(", ");
//     } else if (typeof toRaw === "object") {
//       toRaw = extractEmail(toRaw) || JSON.stringify(toRaw);
//     }
//     const to = String(toRaw || "").trim();

//     const subject = raw.subject || raw.mail?.subject || raw.headers?.subject || raw.Subject || "No Subject";
//     const text = raw.text || raw.plain || raw.body || raw.message || raw["body-plain"] || "";
//     const html = raw.html || raw.htmlBody || raw["body-html"] || "";
//     const messageId = (raw.messageId || raw["Message-Id"] || raw["message-id"] || raw.mail?.messageId || "").trim();
//     const inReplyTo = (raw.inReplyTo || raw["in-reply-to"] || raw.mail?.inReplyTo || "").trim();

//     console.log("🔎 Normalized:", { fromEmail, to: (to || "").slice(0,200), subject, messageId, inReplyTo });

//     // Basic validation
//     if (!fromEmail) {
//       console.log("❌ MISSING fromEmail");
//       return new Response(JSON.stringify({ error: "Missing sender email" }), { status: 400 });
//     }

//     if (!to) {
//       console.log("❌ MISSING recipient (to)");
//       return new Response(JSON.stringify({ error: "Missing recipient (to)" }), { status: 400 });
//     }

//     if (!text && !html) {
//       console.log("❌ EMPTY BODY (no text/html)");
//       return new Response(JSON.stringify({ error: "Empty email body" }), { status: 400 });
//     }

//     // ✅ Extra Protection: Only allow support email (case-insensitive)
//     if (!to.toLowerCase().includes(SUPPORT_EMAIL.toLowerCase())) {
//       console.log("❌ NOT SUPPORT EMAIL:", to);
//       return new Response(JSON.stringify({ error: "Invalid mailbox" }), { status: 403 });
//     }

//     // ----- Thread locate with both emailThreadId and messages.messageId search -----
//     let ticket = null;
//     const searchIds = [];
//     if (inReplyTo) searchIds.push(inReplyTo);
//     if (messageId) searchIds.push(messageId);

//     if (searchIds.length > 0) {
//       ticket = await Ticket.findOne({
//         $or: [
//           { emailThreadId: { $in: searchIds } },
//           { "messages.messageId": { $in: searchIds } },
//         ],
//       }).exec();
//     }

//     // If nothing found, create new ticket
//     if (!ticket) {
//       console.log("🆕 Creating new ticket");
//       const threadId = messageId || inReplyTo || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
//    // before creating a new ticket, ensure no ticket already has the messageId
// if (messageId) {
//   const existing = await Ticket.findOne({ "messages.messageId": messageId });
//   if (existing) {
//     console.log("Duplicate messageId — skipping");
//     return new Response(JSON.stringify({ success: true, ticketId: existing._id }), { status: 200 });
//   }
// }

//       ticket = await Ticket.create({
//         customerEmail: fromEmail,
//         subject: subject || "No Subject",
//         source: "email",
//         status: "open",
//         emailThreadId: threadId,
//         messages: [],
//       });
//     }

//     // Add message
//     const pushMessage = {
//       senderType: "customer",
//       externalEmail: fromEmail,
//       message: text || html,
//       messageId: messageId || inReplyTo || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
//       inReplyTo: inReplyTo || "",
//       receivedAt: new Date(),
//     };

//     ticket.messages.push(pushMessage);
//     ticket.lastReplyAt = new Date();
//     await ticket.save();

//     console.log("✅ TICKET UPDATED:", ticket._id?.toString?.(), " thread:", ticket.emailThreadId);
//     return new Response(JSON.stringify({ success: true, ticketId: ticket._id }), { status: 200 });
//   } catch (err) {
//     console.error("❌ EMAIL INBOUND ERROR:", err?.message || err, err?.stack || "");
//     return new Response(JSON.stringify({ error: (err && err.message) || String(err) }), { status: 500 });
//   }
// }

// // TEST ROUTE
// export async function GET() {
//   return new Response(JSON.stringify({ success: true, message: "Email inbound API is working ✅" }), { status: 200 });
// }
