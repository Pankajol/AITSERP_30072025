import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function POST(req, { params }) {
  await dbConnect();

  const ticketId = params.id;
  const body = await req.json();
  const messageText = body.message?.trim();
  const attachments = body.attachments || [];

  if (!messageText) {
    return Response.json(
      { success: false, msg: "Message is required" },
      { status: 400 }
    );
  }

  /* ================= AUTH & SENDER TYPE ================= */

  const token = getTokenFromHeader(req);
  let senderType = "customer";
  let senderUser = null;

  if (token) {
    try {
      senderUser = verifyJWT(token);
      senderType = "agent";
    } catch {
      senderType = "customer";
    }
  }

  /* ================= FETCH TICKET ================= */

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    return Response.json(
      { success: false, msg: "Ticket not found" },
      { status: 404 }
    );
  }

  /* ================= CLOSED TICKET RULE ================= */

  if (ticket.status === "closed") {
    if (senderType === "agent") {
      // ❌ Agent cannot reply to closed ticket
      return Response.json(
        { success: false, msg: "Ticket is already closed" },
        { status: 403 }
      );
    }

    // ✅ CUSTOMER REPLY → AUTO REOPEN
    ticket.status = "open";
    ticket.autoClosed = false;
  }

  /* ================= CREATE MESSAGE ================= */

  const newMessage = {
    senderType,
    sender: senderType === "agent" ? senderUser.id : undefined,
    externalEmail:
      senderType === "customer" ? ticket.customerEmail : undefined,
    message: messageText,
    attachments,
  };

  ticket.messages.push(newMessage);

  /* ================= SLA / TIMESTAMPS ================= */

  ticket.lastReplyAt = new Date();

  if (senderType === "customer") {
    ticket.lastCustomerReplyAt = new Date();
  }

  if (senderType === "agent") {
    ticket.lastAgentReplyAt = new Date();
  }

  await ticket.save();

  /* ================= RESPONSE ================= */

  return Response.json({
    success: true,
    reopened:
      senderType === "customer" && ticket.status === "open",
    ticket,
  });
}



// export const runtime = "nodejs";

// import connectDB from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import CompanyUser from "@/models/CompanyUser";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { transporter } from "@/lib/mailer"; // must export transporter from /lib/mailer.js

// const SAMPLE_AVATAR = "/mnt/data/default-avatar.png";

// /** Helpers **/
// function makePlusAddress(smtpUser, ticketId) {
//   if (!smtpUser || !ticketId) return smtpUser;
//   const parts = String(smtpUser).split("@");
//   if (parts.length !== 2) return smtpUser;
//   const safeId = String(ticketId).replace(/[^a-zA-Z0-9-_.:]/g, "");
//   return `${parts[0]}+${safeId}@${parts[1]}`;
// }

// function normalizeMessageId(id) {
//   if (!id) return null;
//   // remove surrounding angle brackets if any, then rewrap with <>
//   let s = String(id).trim();
//   s = s.replace(/^<|>$/g, "");
//   if (!s) return null;
//   return `<${s}>`;
// }

// /** Route **/
// export async function POST(req, context) {
//   try {
//     // Next.js: resolve params first
//     const params = await context.params;
//     await connectDB();

//     // ---- AUTH ----
//     const token = getTokenFromHeader(req);
//     if (!token) {
//       return new Response(JSON.stringify({ success: false, msg: "Unauthorized" }), { status: 401 });
//     }

//     let userPayload;
//     try {
//       userPayload = await verifyJWT(token);
//     } catch (e) {
//       console.error("Auth verify failed:", e);
//       return new Response(JSON.stringify({ success: false, msg: "Invalid token" }), { status: 401 });
//     }

//     const senderId = userPayload?.id;
//     const senderName = userPayload?.name || "Support";

//     // ---- params + body ----
//     const ticketId = params?.id;
//     if (!ticketId) {
//       return new Response(JSON.stringify({ success: false, msg: "Ticket id missing" }), { status: 400 });
//     }

//     const body = await req.json().catch(() => null);
//     if (!body?.message?.trim()) {
//       return new Response(JSON.stringify({ success: false, msg: "Message is required" }), { status: 400 });
//     }
//     const text = body.message.trim();
//     const providedMessageId = (body.messageId || "").trim();

//     // ---- load ticket ----
//     const ticket = await Ticket.findById(ticketId)
//       .populate("customerId", "email name avatar")
//       .populate("agentId", "email name avatar")
//       .exec();

//     if (!ticket) {
//       return new Response(JSON.stringify({ success: false, msg: "Ticket not found" }), { status: 404 });
//     }

//     // ---- determine sender type ----
//     const senderUser = await CompanyUser.findById(senderId).lean().catch(() => null);
//     const isAgent = !!(senderUser && Array.isArray(senderUser.roles) && senderUser.roles.includes("agent"));
//     const senderType = isAgent ? "agent" : "customer";

//     // capture external email (customer via UI)
//     let externalEmailForMessage = null;
//     if (!isAgent) externalEmailForMessage = userPayload?.email || ticket.customerEmail || undefined;

//     // ---- append message to ticket ----
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

//     // update status/agent if agent replied
//     if (isAgent) {
//       if (ticket.status === "open") ticket.status = "in-progress";
//       ticket.agentId = ticket.agentId || senderId;
//     }

//     await ticket.save();

//     // ---- repopulate fresh ticket for email & response ----
//     const populated = await Ticket.findById(ticketId)
//       .populate("messages.sender", "name email avatar")
//       .populate("customerId", "name email avatar")
//       .populate("agentId", "name email avatar")
//       .lean();

//     // ensure avatars
//     if (Array.isArray(populated?.messages)) {
//       populated.messages = populated.messages.map((m) => {
//         if (!m.sender) return m;
//         if (!m.sender.avatar) m.sender.avatar = SAMPLE_AVATAR;
//         return m;
//       });
//     }
//     if (populated?.customerId && !populated.customerId.avatar) populated.customerId.avatar = SAMPLE_AVATAR;
//     if (populated?.agentId && !populated.agentId.avatar) populated.agentId.avatar = SAMPLE_AVATAR;

//     // ---- threading: use last message id as fallback, normalize for headers ----
//     const msgs = Array.isArray(populated.messages) ? populated.messages : [];
//     const lastMsg = msgs.length ? msgs[msgs.length - 1] : null;
//     const lastMsgIdRaw = lastMsg?.messageId || null;

//     const threadRaw = ticket.emailThreadId || lastMsgIdRaw || null;
//     const threadId = normalizeMessageId(threadRaw);
//     const lastMsgId = normalizeMessageId(lastMsgIdRaw);

//     const refs = [];
//     if (ticket.emailThreadId) refs.push(normalizeMessageId(ticket.emailThreadId));
//     if (lastMsgId && lastMsgId !== normalizeMessageId(ticket.emailThreadId)) refs.push(lastMsgId);
//     const referencesHeader = refs.length ? refs.join(" ") : undefined;

//     // ---- env & recipient selection ----
//     const smtpUser = process.env.SMTP_USER || null;
//     const supportEmail = process.env.SUPPORT_EMAIL || smtpUser || null;

//     // Always prefer ticket.customerEmail
//     let mailTo = ticket.customerEmail || null;

//     // fallback: last external email or populated customer email
//     if (!mailTo) {
//       for (let i = msgs.length - 1; i >= 0; i--) {
//         const m = msgs[i];
//         if (m.externalEmail) { mailTo = m.externalEmail; break; }
//         if (m.sender && typeof m.sender === "object" && m.sender.email) { mailTo = m.sender.email; break; }
//       }
//       if (!mailTo && populated.customerId?.email) mailTo = populated.customerId.email;
//     }

//     // If no recipient found, log and skip sending but still return success
//     if (!mailTo) {
//       console.warn("No recipient found for ticket outbound email. ticketId:", ticketId);
//     } else {
//       // prepare plus-address replyTo and subject
//       const plusReplyTo = makePlusAddress(smtpUser, ticket._id);
//       const displayName = senderName || "Support";
//       const fromAddress = smtpUser;
//       const replyToAddress = plusReplyTo || supportEmail;

//       const subjectPrefix = isAgent ? `Reply on your ticket:` : `New customer reply on ticket:`;
//       const subject = `${subjectPrefix} ${ticket.subject || "(no subject)"} [Ticket:${ticket._id}]`;

//       const emailHtml = `
//         <p>Hello ${populated.customerId?.name || ticket.customerEmail || "Customer"},</p>
//         <p>${isAgent ? "You have a new reply from support:" : "Customer replied:"}</p>
//         <div style="padding:12px;border-radius:6px;background:#f6f8fa;border:1px solid #e1e4e8;">
//           ${text.replace(/\n/g, "<br>")}
//         </div>
//         <p>Ticket: <strong>${ticket.subject || ""}</strong></p>
//         <hr />
//         <p>This message sent by your support portal.</p>
//       `;

//       const mailOptions = {
//         from: `${displayName} <${fromAddress}>`,
//         to: mailTo,
//         subject,
//         html: emailHtml,
//         replyTo: replyToAddress,
//         headers: {},
//       };

//       // bcc support for records (but don't bcc if recipient is same as support)
//       if (supportEmail && supportEmail !== mailOptions.to) mailOptions.bcc = supportEmail;

//       if (threadId) {
//         mailOptions.inReplyTo = threadId;
//         mailOptions.headers["In-Reply-To"] = threadId;
//       } else if (lastMsgId) {
//         mailOptions.inReplyTo = lastMsgId;
//         mailOptions.headers["In-Reply-To"] = lastMsgId;
//       }
//       if (referencesHeader) mailOptions.headers["References"] = referencesHeader;

//       // DEBUG block
//       console.log("=== MAIL DEBUG ===");
//       console.log("to:", mailOptions.to);
//       console.log("from:", mailOptions.from);
//       console.log("replyTo:", mailOptions.replyTo);
//       if (mailOptions.bcc) console.log("bcc:", mailOptions.bcc);
//       console.log("in-reply-to:", mailOptions.inReplyTo);
//       console.log("references:", mailOptions.headers["References"]);
//       console.log("==================");

//       // send mail and persist metadata
//       try {
//         const info = await transporter.sendMail(mailOptions);
//         console.log("mailer.sendMail OK:", {
//           messageId: info?.messageId,
//           accepted: info?.accepted,
//           rejected: info?.rejected,
//           response: info?.response,
//         });

//         // Save outbound metadata and ensure emailThreadId exists (store raw messageId returned)
//         ticket.lastOutbound = {
//           to: mailOptions.to,
//           bcc: mailOptions.bcc || undefined,
//           messageId: info?.messageId || null,
//           accepted: info?.accepted || [],
//           rejected: info?.rejected || [],
//           sentAt: new Date(),
//         };
//         if (!ticket.emailThreadId && info?.messageId) {
//           // store the raw messageId (provider returned format). We'll normalize only when building headers.
//           ticket.emailThreadId = info.messageId;
//         }
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

//     // return fresh populated ticket
//     const final = await Ticket.findById(ticketId)
//       .populate("messages.sender", "name email avatar")
//       .populate("customerId", "name email avatar")
//       .populate("agentId", "name email avatar")
//       .lean();

//     // ensure avatar fallback again (safety)
//     if (Array.isArray(final?.messages)) {
//       final.messages = final.messages.map((m) => {
//         if (!m.sender) return m;
//         if (!m.sender.avatar) m.sender.avatar = SAMPLE_AVATAR;
//         return m;
//       });
//     }
//     if (final?.customerId && !final.customerId.avatar) final.customerId.avatar = SAMPLE_AVATAR;
//     if (final?.agentId && !final.agentId.avatar) final.agentId.avatar = SAMPLE_AVATAR;

//     return new Response(JSON.stringify({ success: true, ticket: final }), { status: 200 });
//   } catch (err) {
//     console.error("Message API Error (fatal):", err);
//     return new Response(JSON.stringify({ success: false, msg: err?.message || "Server error" }), { status: 500 });
//   }
// }



//  ok working


// // app/api/helpdesk/tickets/[id]/message/route.js
// export const runtime = "nodejs";

// import connectDB from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import CompanyUser from "@/models/CompanyUser";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { transporter } from "@/lib/mailer"; // ensure this exists and exports a nodemailer transporter

// const SAMPLE_AVATAR = "/mnt/data/default-avatar.png";

// /**
//  * Outbound reply handler:
//  * - Always send replies TO ticket.customerEmail (or best fallback).
//  * - Show agent/admin name in From but send via SMTP_USER.
//  * - Set replyTo to smtpUser+<ticketId>@domain (plus-address) so replies contain ticket id.
//  * - Include [Ticket:<id>] in subject as fallback.
//  * - Save info.messageId into ticket.emailThreadId (if missing) and ticket.lastOutbound.
//  */

// function makePlusAddress(smtpUser, ticketId) {
//   if (!smtpUser || !ticketId) return smtpUser;
//   const parts = smtpUser.split("@");
//   if (parts.length !== 2) return smtpUser;
//   // sanitize id (keep alnum and -_)
//   const safeId = String(ticketId).replace(/[^a-zA-Z0-9-_:.]/g, "");
//   return `${parts[0]}+${safeId}@${parts[1]}`;
// }

// export async function POST(req, context) {
//   try {
//     const params = await context.params;
//     await connectDB();

//     // AUTH
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

//     // PARAMS + BODY
//     const ticketId = params?.id;
//     if (!ticketId) return new Response(JSON.stringify({ success: false, msg: "Ticket id missing" }), { status: 400 });

//     const body = await req.json().catch(() => null);
//     if (!body?.message?.trim()) return new Response(JSON.stringify({ success: false, msg: "Message is required" }), { status: 400 });

//     const text = body.message.trim();
//     const providedMessageId = (body.messageId || "").trim();

//     // LOAD TICKET
//     const ticket = await Ticket.findById(ticketId)
//       .populate("customerId", "email name avatar")
//       .populate("agentId", "email name avatar")
//       .exec();

//     if (!ticket) return new Response(JSON.stringify({ success: false, msg: "Ticket not found" }), { status: 404 });

//     // DETERMINE SENDER (agent/customer)
//     const senderUser = await CompanyUser.findById(senderId).lean().catch(() => null);
//     const isAgent = !!(senderUser && Array.isArray(senderUser.roles) && senderUser.roles.includes("agent"));
//     const senderType = isAgent ? "agent" : "customer";

//     // capture external email if customer posts via UI
//     let externalEmailForMessage = null;
//     if (!isAgent) externalEmailForMessage = userPayload?.email || ticket.customerEmail || null;

//     // APPEND MESSAGE TO TICKET MESSAGES (DB)
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

//     // update status/agent if agent replied
//     if (isAgent) {
//       if (ticket.status === "open") ticket.status = "in-progress";
//       ticket.agentId = ticket.agentId || senderId;
//     }

//     await ticket.save();

//     // REPOLL populated data
//     const populated = await Ticket.findById(ticketId)
//       .populate("messages.sender", "name email avatar")
//       .populate("customerId", "name email avatar")
//       .populate("agentId", "name email avatar")
//       .lean();

//     // set fallback avatars
//     if (Array.isArray(populated?.messages)) {
//       populated.messages = populated.messages.map((m) => {
//         if (!m.sender) return m;
//         if (!m.sender.avatar) m.sender.avatar = SAMPLE_AVATAR;
//         return m;
//       });
//     }
//     if (populated?.customerId && !populated.customerId.avatar) populated.customerId.avatar = SAMPLE_AVATAR;
//     if (populated?.agentId && !populated.agentId.avatar) populated.agentId.avatar = SAMPLE_AVATAR;

//     // THREADING
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

//     // ENV
//     const smtpUser = process.env.SMTP_USER || null;
//     const supportEmail = process.env.SUPPORT_EMAIL || smtpUser;

//     // CHOOSE RECIPIENT: ALWAYS PREFER ticket.customerEmail
//     let mailTo = ticket.customerEmail || null;

//     // fallback: last external email in messages or populated.customerId.email
//     if (!mailTo) {
//       const msgs = (populated.messages || []).slice().reverse();
//       for (const m of msgs) {
//         if (m.externalEmail) { mailTo = m.externalEmail; break; }
//         if (m.sender && typeof m.sender === "object" && m.sender.email) { mailTo = m.sender.email; break; }
//       }
//       if (!mailTo && populated.customerId?.email) mailTo = populated.customerId.email;
//     }

//     if (!mailTo) {
//       console.warn("No customer recipient found for ticket:", ticketId);
//     } else {
//       // prepare plus-address replyTo and subject with ticket id
//       const plusReplyTo = makePlusAddress(smtpUser, ticket._id);
//       const displayName = senderName || "Support";
//       const fromAddress = smtpUser;
//       const replyToAddress = plusReplyTo || supportEmail;

//       // include Ticket id in subject for fallback matching
//       const subjectPrefix = isAgent ? `Reply on your ticket:` : `New customer reply on ticket:`;
//       const subject = `${subjectPrefix} ${ticket.subject || "(no subject)"} [Ticket:${ticket._id}]`;

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
//         from: `${displayName} <${fromAddress}>`,
//         to: mailTo,
//         subject,
//         html: emailHtml,
//         replyTo: replyToAddress,
//         headers: {},
//       };

//       if (supportEmail && supportEmail !== mailOptions.to) mailOptions.bcc = supportEmail;

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
//       console.log("from:", mailOptions.from);
//       console.log("replyTo:", mailOptions.replyTo);
//       if (mailOptions.bcc) console.log("bcc:", mailOptions.bcc);
//       console.log("in-reply-to:", mailOptions.inReplyTo);
//       console.log("==================");

//       try {
//         const info = await transporter.sendMail(mailOptions);
//         console.log("mailer.sendMail OK:", { messageId: info?.messageId, accepted: info?.accepted, response: info?.response });

//         // Save outbound metadata and ensure emailThreadId set if missing
//         ticket.lastOutbound = {
//           to: mailOptions.to,
//           bcc: mailOptions.bcc || undefined,
//           messageId: info?.messageId || null,
          
//           accepted: info?.accepted || [],
//           rejected: info?.rejected || [],
//           sentAt: new Date(),
//         };
//         if (!ticket.emailThreadId && info?.messageId) {
//           ticket.emailThreadId = info.messageId;
//         }
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

//     // return fresh ticket
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

