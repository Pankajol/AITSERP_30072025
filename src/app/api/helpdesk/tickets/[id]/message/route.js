// app/api/mail/inbound/route.js
export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";

const FALLBACK_SUPPORT_EMAIL = "pankajal2099@gmail.com";

function extractEmail(value) {
  if (!value) return "";
  if (Array.isArray(value)) value = value[0];
  if (typeof value === "object" && value !== null) {
    return (value.email || value.address || value.mail || value.value || "").toString();
  }
  try {
    const s = String(value);
    const angleRemoved = s.replace(/<|>/g, " ");
    const m = angleRemoved.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    return m ? m[1] : s.trim();
  } catch (e) {
    return "";
  }
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
    // fallback to key:val parsing
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

function ticketIdFromTo(to) {
  try {
    if (!to) return null;
    const parts = to.split(",").map(s => s.trim());
    for (const p of parts) {
      const m = p.match(/\+([a-zA-Z0-9\-\_\.:\@]{6,})@/);
      if (m && m[1]) {
        const token = m[1].split("@")[0];
        if (token) return token;
      }
      const n = p.match(/<[^>+]+?\+([a-f0-9]{6,24})@[^>]+>/i);
      if (n && n[1]) return n[1];
    }
    return null;
  } catch (e) {
    return null;
  }
}

/** Try to discover the real 'from' — many providers wrap/forward messages */
function discoverSender(raw, smtpUser) {
  // prioritized list of candidate fields
  const candidates = [];

  // common provider fields
  candidates.push(raw.from, raw.fromEmail, raw.sender, raw.mail && raw.mail.source);
  candidates.push(raw["From"], raw.headers && raw.headers.from, raw.headers && raw.headers["From"]);
  candidates.push(raw.envelope && raw.envelope.from, raw.envelope && raw.envelope.sender);
  candidates.push(raw["reply-to"], raw.replyTo || raw["Reply-To"] || raw.headers && raw.headers["reply-to"]);
  candidates.push(raw.headers && raw.headers["x-original-sender"], raw.headers && raw.headers["x-forwarded-from"]);
  candidates.push(raw.Sender, raw.sender && raw.sender.email);

  // flatten and map to emails
  for (const c of candidates) {
    const e = extractEmail(c);
    if (e) {
      // ignore if equals smtpUser (we will handle loop separately)
      if (smtpUser && e.toLowerCase().includes(smtpUser.toLowerCase())) {
        // still capture, but mark it; we'll check headers for original later
        continue;
      }
      return { email: e, matchedField: c ? "direct" : "unknown" };
    }
  }

  // if none found, check headers for X-Original-From inside header strings
  if (raw.headers && typeof raw.headers === "object") {
    const keys = Object.keys(raw.headers);
    for (const k of keys) {
      const v = String(raw.headers[k] || "");
      const m = v.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (m && m[1]) {
        const e = m[1];
        if (!(smtpUser && e.toLowerCase().includes(smtpUser.toLowerCase()))) {
          return { email: e, matchedField: `header:${k}` };
        }
      }
    }
  }

  // last resort: if headers contain smtpUser but there's an 'X-Original-Sender' text, pick that
  return { email: null, matchedField: null };
}

export async function POST(req) {
  try {
    console.log("📩 INBOUND: start");
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

    // quick header sample log
    try {
      const headerSample = {};
      for (const [k, v] of req.headers) headerSample[k] = (v + "").slice(0, 300);
      console.log("HEADERS:", JSON.stringify(headerSample));
    } catch (e) {}

    // normalize
    const smtpUser = (process.env.SMTP_USER || "").toLowerCase();
    const fromCandidate = discoverSender(raw, smtpUser);
    let fromEmail = fromCandidate.email || extractEmail(raw.from || raw.fromEmail || raw.sender || raw["From"] || raw.headers && raw.headers.from);
    fromEmail = (fromEmail || "").toString().trim();

    // If we only saw smtpUser as from (forwarded) then try extracting original from headers
    if ((!fromEmail || fromEmail.toLowerCase().includes(smtpUser)) && raw.headers) {
      // some providers forward original-from in headers, try to find it
      const hdrs = raw.headers;
      const checkKeys = ["x-original-sender","x-forwarded-for","x-original-from","x-forwarded-from","return-path","resent-from"];
      for (const k of checkKeys) {
        if (hdrs[k]) {
          const ex = extractEmail(hdrs[k]);
          if (ex && !(smtpUser && ex.toLowerCase().includes(smtpUser))) {
            fromEmail = ex;
            console.log("discover: original-from via header", k, ex);
            break;
          }
        }
      }
    }

    // fallback to envelope.from or mail.envelope
    if (!fromEmail) {
      fromEmail = extractEmail(raw.envelope && raw.envelope.from) || extractEmail(raw.mail && raw.mail.envelope && raw.mail.envelope.from) || "";
    }

    const toRaw = raw.to || raw.recipient || (raw.envelope && raw.envelope.to) || (raw.mail && raw.mail.destination) || (raw.headers && raw.headers.to) || raw["To"] || "";
    const to = Array.isArray(toRaw) ? toRaw.map(t => extractEmail(t)).filter(Boolean).join(", ") : (typeof toRaw === "object" ? extractEmail(toRaw) : String(toRaw || "").trim());

    const subject = raw.subject || raw.mail && raw.mail.subject || (raw.headers && raw.headers.subject) || raw["subject"] || "";
    const text = raw.text || raw.plain || raw.body || raw.message || raw["body-plain"] || raw["text"] || "";
    const html = raw.html || raw.htmlBody || raw["body-html"] || "";

    const messageId = normalizeId(raw.messageId || raw["Message-Id"] || raw["message-id"] || raw.mail && raw.mail.messageId || (raw.headers && raw.headers["message-id"]) || "");
    const inReplyTo = normalizeId(raw.inReplyTo || raw["in-reply-to"] || raw.mail && raw.mail.inReplyTo || (raw.headers && raw.headers["in-reply-to"]) || "");

    const referencesRaw = raw.references || raw["References"] || (raw.headers && raw.headers.references) || (raw.headers && raw.headers.References) || "";
    const references = (referencesRaw || "").toString().split(/\s+/).map(normalizeId).filter(Boolean);

    console.log("NORMAL:", { fromEmail, to: (to||"").slice(0,200), subject: subject.slice(0,200), messageId, inReplyTo, references, discoveredFromField: fromCandidate.matchedField });

    if (!fromEmail) {
      console.warn("Missing fromEmail after discovery");
      return new Response(JSON.stringify({ error: "Missing sender email" }), { status: 400 });
    }
    if (!to) {
      console.warn("Missing recipient to");
      return new Response(JSON.stringify({ error: "Missing recipient (to)" }), { status: 400 });
    }
    if (!text && !html) {
      console.warn("Empty body");
      return new Response(JSON.stringify({ error: "Empty email body" }), { status: 400 });
    }

    const SUPPORT_EMAIL = (process.env.SUPPORT_EMAIL || FALLBACK_SUPPORT_EMAIL).toLowerCase();

    // ensure delivered to support mail
    if (!to.toLowerCase().includes(SUPPORT_EMAIL)) {
      console.warn("Email TO doesn't contain support mailbox:", to);
      return new Response(JSON.stringify({ error: "Invalid mailbox" }), { status: 403 });
    }

    // ignore definite loop (email from our SMTP account that is not forwarded)
    if (smtpUser && fromEmail.toLowerCase().includes(smtpUser)) {
      // but if headers contain an original sender, prefer that (we handled earlier)
      console.log("From looks like smtpUser; ignoring to prevent loop. from:", fromEmail);
      return new Response(JSON.stringify({ success: true, ignored: true }), { status: 200 });
    }

    // Try to match ticket by headers (in-reply-to / messageId / references / lastOutbound)
    let ticket = null;
    const searchIds = [];
    if (inReplyTo) searchIds.push(inReplyTo);
    if (messageId) searchIds.push(messageId);
    for (const r of references) if (r) searchIds.push(r);

    if (searchIds.length > 0) {
      console.log("Searching by ids:", searchIds);
      ticket = await Ticket.findOne({
        $or: [
          { emailThreadId: { $in: searchIds } },
          { "messages.messageId": { $in: searchIds } },
          { "lastOutbound.messageId": { $in: searchIds } },
        ],
      }).exec();
      if (ticket) console.log("Matched ticket by thread id:", ticket._id.toString());
    }

    // If still not matched, try:
    // 1) find ticket where customerEmail equals fromEmail (common case: direct reply)
    if (!ticket) {
      const t1 = await Ticket.findOne({ customerEmail: { $regex: new RegExp("^" + fromEmail + "$", "i") } }).exec();
      if (t1) {
        ticket = t1;
        console.log("Matched ticket by customerEmail:", ticket._id.toString());
      }
    }

    // 2) try messages.externalEmail match (maybe previously recorded)
    if (!ticket) {
      const t2 = await Ticket.findOne({ "messages.externalEmail": { $regex: new RegExp("^" + fromEmail + "$", "i") } }).exec();
      if (t2) {
        ticket = t2;
        console.log("Matched ticket by prior messages.externalEmail:", ticket._id.toString());
      }
    }

    // 3) try plus-address in 'to' (support+ticketid)
    if (!ticket) {
      const plusId = ticketIdFromTo(to);
      if (plusId) {
        try {
          const maybe = await Ticket.findById(plusId).exec();
          if (maybe) { ticket = maybe; console.log("Matched via plus-address:", plusId); }
        } catch (e) { /* ignore */ }
      }
    }

    // duplicate guard
    if (messageId) {
      const dup = await Ticket.findOne({ "messages.messageId": messageId }).select("_id").lean().exec();
      if (dup) {
        console.log("Duplicate messageId already processed:", messageId);
        return new Response(JSON.stringify({ success: true, duplicate: true, ticketId: dup._id }), { status: 200 });
      }
    }

    // if still none -> create new ticket
    if (!ticket) {
      console.log("No ticket matched — creating new for fromEmail:", fromEmail);
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
      console.log("Created ticket:", ticket._id.toString());
    }

    // Append message, set receivedAt for robustness
    const pushMessage = {
      sender: null,
      senderType: "customer",
      externalEmail: fromEmail,
      message: text || html || "(no content)",
      messageId: messageId || inReplyTo || `msg-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      inReplyTo: inReplyTo || "",
      receivedAt: new Date(),
      createdAt: new Date(), // subdoc timestamps are handled by mongoose timestamps as well
    };

    ticket.messages.push(pushMessage);
    ticket.lastReplyAt = new Date();
    if (!ticket.emailThreadId && (messageId || inReplyTo)) ticket.emailThreadId = messageId || inReplyTo;
    await ticket.save();

    console.log("Appended message to ticket:", ticket._id.toString(), " new messageId:", pushMessage.messageId, " from:", fromEmail, "matchedBy:", fromCandidate.matchedField);
    return new Response(JSON.stringify({ success: true, appended: true, ticketId: ticket._id, messageId: pushMessage.messageId }), { status: 200 });

  } catch (err) {
    console.error("Inbound handler error:", err && (err.stack || err.message || err));
    return new Response(JSON.stringify({ error: (err && err.message) || String(err) }), { status: 500 });
  }
}

export async function GET() {
  return new Response(JSON.stringify({ success: true, message: "Inbound ok" }), { status: 200 });
}



// // /app/api/helpdesk/tickets/[id]/message/route.js
// import connectDB from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import CompanyUser from "@/models/CompanyUser";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { transporter } from "@/lib/mailer"; // ensure transporter exported from /lib/mailer.js

// const SAMPLE_AVATAR = "/mnt/data/default-avatar.png";

// /**
//  * Behavior:
//  * - Outgoing mail authenticates using SMTP_USER (process.env.SMTP_USER).
//  * - Emails show agent/admin name in the From header but are sent via SMTP_USER.
//  * - replyTo is SUPPORT_EMAIL (process.env.SUPPORT_EMAIL) so replies return to support inbox.
//  * - SUPPORT_EMAIL also receives a BCC copy when it's different from the primary recipient.
//  *
//  * IMPORTANT: ensure your inbound mail parser ignores messages from SMTP_USER (or checks Message-ID)
//  * to avoid re-ingesting outbound messages (prevent loops).
//  */

// export async function POST(req, context) {
//   try {
//     const params = await context.params;
//     await connectDB();

//     // ----- AUTH -----
//     const token = getTokenFromHeader(req);
//     if (!token) return new Response(JSON.stringify({ success: false, msg: "Unauthorized" }), { status: 401 });

//     let userPayload;
//     try {
//       userPayload = await verifyJWT(token);
//     } catch (e) {
//       console.error("Auth verify failed:", e);
//       return new Response(JSON.stringify({ success: false, msg: "Invalid token" }), { status: 401 });
//     }

//     const senderId = userPayload?.id;
//     const senderName = userPayload?.name || "Support";

//     // ----- params + body validation -----
//     const ticketId = params?.id;
//     if (!ticketId) return new Response(JSON.stringify({ success: false, msg: "Ticket id missing" }), { status: 400 });

//     const body = await req.json().catch(() => null);
//     if (!body?.message?.trim()) return new Response(JSON.stringify({ success: false, msg: "Message is required" }), { status: 400 });

//     const text = body.message.trim();
//     const providedMessageId = body.messageId || "";

//     // ----- load ticket (with customer & agent) -----
//     const ticket = await Ticket.findById(ticketId)
//       .populate("customerId", "email name")
//       .populate("agentId", "email name")
//       .exec();

//     if (!ticket) return new Response(JSON.stringify({ success: false, msg: "Ticket not found" }), { status: 404 });

//     // ----- determine sender type (agent/customer) -----
//     const senderUser = await CompanyUser.findById(senderId).lean().catch(() => null);
//     const isAgent = !!(senderUser && Array.isArray(senderUser.roles) && senderUser.roles.includes("agent"));
//     const senderType = isAgent ? "agent" : "customer";

//     // If sender is customer and ticket was created via email, capture externalEmail
//     let externalEmailForMessage = null;
//     if (!isAgent) {
//       externalEmailForMessage = userPayload?.email || ticket.customerEmail || null;
//     }

//     // ----- append message ensuring required fields exist -----
//     const newMessage = {
//       sender: senderId || null,
//       senderType,
//       message: text,
//       aiSuggested: false,
//       messageId: providedMessageId || undefined,
//       inReplyTo: providedMessageId ? providedMessageId : undefined,
//       externalEmail: externalEmailForMessage || undefined,
//       createdAt: new Date(),
//     };

//     ticket.messages.push(newMessage);

//     // ----- ticket status/agent updates if agent replied -----
//     if (isAgent) {
//       if (ticket.status === "open") ticket.status = "in-progress";
//       ticket.agentId = ticket.agentId || senderId;
//     }

//     await ticket.save();

//     // ----- populate fresh ticket for response & email data -----
//     const populated = await Ticket.findById(ticketId)
//       .populate("messages.sender", "name email avatar")
//       .populate("customerId", "name email avatar")
//       .populate("agentId", "name email avatar")
//       .lean();

//     // fallback avatars
//     if (Array.isArray(populated?.messages)) {
//       populated.messages = populated.messages.map((m) => {
//         if (!m.sender) return m;
//         if (!m.sender.avatar) m.sender.avatar = SAMPLE_AVATAR;
//         return m;
//       });
//     }
//     if (populated?.customerId && !populated.customerId.avatar) populated.customerId.avatar = SAMPLE_AVATAR;
//     if (populated?.agentId && !populated.agentId.avatar) populated.agentId.avatar = SAMPLE_AVATAR;

//     // ----- determine last external and threading headers -----
//     function findLastExternalEmail() {
//       const msgs = (populated.messages || []).slice().reverse();
//       for (const m of msgs) {
//         if (m.externalEmail) return m.externalEmail;
//         if (m.sender && typeof m.sender === "object" && m.sender.email) return m.sender.email;
//       }
//       return null;
//     }

//     const threadId = ticket.emailThreadId || (Array.isArray(populated.messages) && populated.messages[0]?.messageId) || null;

//     const lastMsgId = (() => {
//       const msgs = populated.messages || [];
//       if (msgs.length === 0) return null;
//       const last = msgs[msgs.length - 1];
//       return last.messageId || null;
//     })();

//     const refs = [];
//     if (ticket.emailThreadId) refs.push(ticket.emailThreadId);
//     if (lastMsgId && lastMsgId !== ticket.emailThreadId) refs.push(lastMsgId);
//     const referencesHeader = refs.length ? refs.join(" ") : undefined;

//     const lastExternal = findLastExternalEmail();

//     // ENV values
//     const smtpUser = process.env.SMTP_USER || null; // must be set
//     const supportEmail = process.env.SUPPORT_EMAIL || smtpUser; // fallback to smtpUser if not set

//     // Debug logs (temporary)
//     console.log("RECIPIENT DEBUG: ticket.customerEmail:", ticket.customerEmail);
//     console.log("RECIPIENT DEBUG: populated.customerId?.email:", populated.customerId?.email);
//     console.log("RECIPIENT DEBUG: agent.email:", populated.agentId?.email);
//     console.log("RECIPIENT DEBUG: lastExternalEmail:", lastExternal);
//     console.log("ENV: SUPPORT_EMAIL:", supportEmail, "SMTP_USER:", smtpUser, "SUPPORT===SMTP:", supportEmail === smtpUser);

//     // =========================================================
//     // CORE REQUIREMENT: ALWAYS send agent/admin replies TO CUSTOMER
//     // =========================================================
//     let mailTo = ticket.customerEmail || lastExternal || (populated.customerId?.email || null);

//     if (!mailTo) {
//       console.warn("No customer email found — skipping sendMail for ticket:", ticketId);
//     } else {
//       // Build mail options: show agent/admin name in From, replyTo → supportEmail, BCC supportEmail when different
//       const displayName = senderName || "Support";
//       const fromAddress = smtpUser;
//       const replyToAddress = supportEmail;

//       const subjectPrefix = isAgent ? `Reply on your ticket:` : `New customer reply on ticket:`;
//       const subject = `${subjectPrefix} ${ticket.subject || "(no subject)"}`;

//       const emailHtml = `
//         <p>Hello ${populated.customerId?.name || ticket.customerEmail || "Customer"},</p>
//         <p>${isAgent ? "You have a new reply from support:" : "Customer replied:"}</p>
//         <div style="padding:12px;border-radius:6px;background:#f6f8fa;border:1px solid #e1e4e8;">
//           ${text.replace(/\n/g, "<br>")}
//         </div>
//         <p>Ticket: <strong>${ticket.subject || ""}</strong></p>
//         <p>--</p>
//         <p>This message sent by your support portal.</p>
//       `;

//       const mailOptions = {
//         from: `${displayName} <${fromAddress}>`, // "Agent Name <smtp_user>"
//         to: mailTo,
//         subject,
//         html: emailHtml,
//         replyTo: replyToAddress,
//         headers: {},
//       };

//       // Add BCC to support if supportEmail not equal primary recipient
//       if (supportEmail && supportEmail !== mailOptions.to) {
//         mailOptions.bcc = supportEmail;
//       }

//       // Threading headers
//       if (threadId) {
//         mailOptions.inReplyTo = threadId;
//         mailOptions.headers["In-Reply-To"] = threadId;
//       } else if (lastMsgId) {
//         mailOptions.inReplyTo = lastMsgId;
//         mailOptions.headers["In-Reply-To"] = lastMsgId;
//       }
//       if (referencesHeader) mailOptions.headers["References"] = referencesHeader;

//       // DEBUG
//       console.log("=== MAIL DEBUG ===");
//       console.log("to:", mailOptions.to);
//       if (mailOptions.bcc) console.log("bcc:", mailOptions.bcc);
//       console.log("from:", mailOptions.from);
//       console.log("subject:", mailOptions.subject);
//       console.log("in-reply-to:", mailOptions.inReplyTo);
//       console.log("references:", mailOptions.headers["References"]);
//       console.log("replyTo:", replyToAddress);
//       console.log("==================");

//       // send and persist result
//       try {
//         const info = await transporter.sendMail(mailOptions);
//         console.log("mailer.sendMail OK:", {
//           messageId: info?.messageId,
//           accepted: info?.accepted,
//           rejected: info?.rejected,
//           response: info?.response,
//         });

//         ticket.lastOutbound = {
//           to: mailOptions.to,
//           bcc: mailOptions.bcc || undefined,
//           messageId: info?.messageId,
//           accepted: info?.accepted,
//           rejected: info?.rejected,
//           sentAt: new Date(),
//         };
//         await ticket.save();
//       } catch (sendErr) {
//         console.error("mailer.sendMail ERROR:", sendErr && (sendErr.message || sendErr));
//         ticket.lastOutbound = {
//           error: String(sendErr?.message || sendErr),
//           attemptedTo: mailOptions.to,
//           attemptedBcc: mailOptions.bcc || undefined,
//           attemptedAt: new Date(),
//         };
//         await ticket.save();
//       }
//     }

//     // Return populated ticket to client (fresh)
//     const final = await Ticket.findById(ticketId)
//       .populate("messages.sender", "name email avatar")
//       .populate("customerId", "name email avatar")
//       .populate("agentId", "name email avatar")
//       .lean();

//     return new Response(JSON.stringify({ success: true, ticket: final }), { status: 200 });
//   } catch (err) {
//     console.error("Message API Error (fatal):", err);
//     return new Response(JSON.stringify({ success: false, msg: err?.message || "Server error" }), { status: 500 });
//   }
// }

