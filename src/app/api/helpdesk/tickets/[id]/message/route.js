// /app/api/helpdesk/tickets/[id]/message/route.js
import connectDB from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { transporter } from "@/lib/mailer"; // ensure transporter exported from /lib/mailer.js

const SAMPLE_AVATAR = "/mnt/data/default-avatar.png";

/**
 * Behavior:
 * - Outgoing mail authenticates using SMTP_USER (process.env.SMTP_USER).
 * - Emails show agent/admin name in the From header but are sent via SMTP_USER.
 * - replyTo is SUPPORT_EMAIL (process.env.SUPPORT_EMAIL) so replies return to support inbox.
 * - SUPPORT_EMAIL also receives a BCC copy when it's different from the primary recipient.
 *
 * IMPORTANT: ensure your inbound mail parser ignores messages from SMTP_USER (or checks Message-ID)
 * to avoid re-ingesting outbound messages (prevent loops).
 */

export async function POST(req, context) {
  try {
    const params = await context.params;
    await connectDB();

    // ----- AUTH -----
    const token = getTokenFromHeader(req);
    if (!token) return new Response(JSON.stringify({ success: false, msg: "Unauthorized" }), { status: 401 });

    let userPayload;
    try {
      userPayload = await verifyJWT(token);
    } catch (e) {
      console.error("Auth verify failed:", e);
      return new Response(JSON.stringify({ success: false, msg: "Invalid token" }), { status: 401 });
    }

    const senderId = userPayload?.id;
    const senderName = userPayload?.name || "Support";

    // ----- params + body validation -----
    const ticketId = params?.id;
    if (!ticketId) return new Response(JSON.stringify({ success: false, msg: "Ticket id missing" }), { status: 400 });

    const body = await req.json().catch(() => null);
    if (!body?.message?.trim()) return new Response(JSON.stringify({ success: false, msg: "Message is required" }), { status: 400 });

    const text = body.message.trim();
    const providedMessageId = body.messageId || "";

    // ----- load ticket (with customer & agent) -----
    const ticket = await Ticket.findById(ticketId)
      .populate("customerId", "email name")
      .populate("agentId", "email name")
      .exec();

    if (!ticket) return new Response(JSON.stringify({ success: false, msg: "Ticket not found" }), { status: 404 });

    // ----- determine sender type (agent/customer) -----
    const senderUser = await CompanyUser.findById(senderId).lean().catch(() => null);
    const isAgent = !!(senderUser && Array.isArray(senderUser.roles) && senderUser.roles.includes("agent"));
    const senderType = isAgent ? "agent" : "customer";

    // If sender is customer and ticket was created via email, capture externalEmail
    let externalEmailForMessage = null;
    if (!isAgent) {
      externalEmailForMessage = userPayload?.email || ticket.customerEmail || null;
    }

    // ----- append message ensuring required fields exist -----
    const newMessage = {
      sender: senderId || null,
      senderType,
      message: text,
      aiSuggested: false,
      messageId: providedMessageId || undefined,
      inReplyTo: providedMessageId ? providedMessageId : undefined,
      externalEmail: externalEmailForMessage || undefined,
      createdAt: new Date(),
    };

    ticket.messages.push(newMessage);

    // ----- ticket status/agent updates if agent replied -----
    if (isAgent) {
      if (ticket.status === "open") ticket.status = "in-progress";
      ticket.agentId = ticket.agentId || senderId;
    }

    await ticket.save();

    // ----- populate fresh ticket for response & email data -----
    const populated = await Ticket.findById(ticketId)
      .populate("messages.sender", "name email avatar")
      .populate("customerId", "name email avatar")
      .populate("agentId", "name email avatar")
      .lean();

    // fallback avatars
    if (Array.isArray(populated?.messages)) {
      populated.messages = populated.messages.map((m) => {
        if (!m.sender) return m;
        if (!m.sender.avatar) m.sender.avatar = SAMPLE_AVATAR;
        return m;
      });
    }
    if (populated?.customerId && !populated.customerId.avatar) populated.customerId.avatar = SAMPLE_AVATAR;
    if (populated?.agentId && !populated.agentId.avatar) populated.agentId.avatar = SAMPLE_AVATAR;

    // ----- determine last external and threading headers -----
    function findLastExternalEmail() {
      const msgs = (populated.messages || []).slice().reverse();
      for (const m of msgs) {
        if (m.externalEmail) return m.externalEmail;
        if (m.sender && typeof m.sender === "object" && m.sender.email) return m.sender.email;
      }
      return null;
    }

    const threadId = ticket.emailThreadId || (Array.isArray(populated.messages) && populated.messages[0]?.messageId) || null;

    const lastMsgId = (() => {
      const msgs = populated.messages || [];
      if (msgs.length === 0) return null;
      const last = msgs[msgs.length - 1];
      return last.messageId || null;
    })();

    const refs = [];
    if (ticket.emailThreadId) refs.push(ticket.emailThreadId);
    if (lastMsgId && lastMsgId !== ticket.emailThreadId) refs.push(lastMsgId);
    const referencesHeader = refs.length ? refs.join(" ") : undefined;

    const lastExternal = findLastExternalEmail();

    // ENV values
    const smtpUser = process.env.SMTP_USER || null; // must be set
    const supportEmail = process.env.SUPPORT_EMAIL || smtpUser; // fallback to smtpUser if not set

    // Debug logs (temporary)
    console.log("RECIPIENT DEBUG: ticket.customerEmail:", ticket.customerEmail);
    console.log("RECIPIENT DEBUG: populated.customerId?.email:", populated.customerId?.email);
    console.log("RECIPIENT DEBUG: agent.email:", populated.agentId?.email);
    console.log("RECIPIENT DEBUG: lastExternalEmail:", lastExternal);
    console.log("ENV: SUPPORT_EMAIL:", supportEmail, "SMTP_USER:", smtpUser, "SUPPORT===SMTP:", supportEmail === smtpUser);

    // =========================================================
    // CORE REQUIREMENT: ALWAYS send agent/admin replies TO CUSTOMER
    // =========================================================
    let mailTo = ticket.customerEmail || lastExternal || (populated.customerId?.email || null);

    if (!mailTo) {
      console.warn("No customer email found — skipping sendMail for ticket:", ticketId);
    } else {
      // Build mail options: show agent/admin name in From, replyTo → supportEmail, BCC supportEmail when different
      const displayName = senderName || "Support";
      const fromAddress = smtpUser;
      const replyToAddress = supportEmail;

      const subjectPrefix = isAgent ? `Reply on your ticket:` : `New customer reply on ticket:`;
      const subject = `${subjectPrefix} ${ticket.subject || "(no subject)"}`;

      const emailHtml = `
        <p>Hello ${populated.customerId?.name || ticket.customerEmail || "Customer"},</p>
        <p>${isAgent ? "You have a new reply from support:" : "Customer replied:"}</p>
        <div style="padding:12px;border-radius:6px;background:#f6f8fa;border:1px solid #e1e4e8;">
          ${text.replace(/\n/g, "<br>")}
        </div>
        <p>Ticket: <strong>${ticket.subject || ""}</strong></p>
        <p>--</p>
        <p>This message sent by your support portal.</p>
      `;

      const mailOptions = {
        from: `${displayName} <${fromAddress}>`, // "Agent Name <smtp_user>"
        to: mailTo,
        subject,
        html: emailHtml,
        replyTo: replyToAddress,
        headers: {},
      };

      // Add BCC to support if supportEmail not equal primary recipient
      if (supportEmail && supportEmail !== mailOptions.to) {
        mailOptions.bcc = supportEmail;
      }

      // Threading headers
      if (threadId) {
        mailOptions.inReplyTo = threadId;
        mailOptions.headers["In-Reply-To"] = threadId;
      } else if (lastMsgId) {
        mailOptions.inReplyTo = lastMsgId;
        mailOptions.headers["In-Reply-To"] = lastMsgId;
      }
      if (referencesHeader) mailOptions.headers["References"] = referencesHeader;

      // DEBUG
      console.log("=== MAIL DEBUG ===");
      console.log("to:", mailOptions.to);
      if (mailOptions.bcc) console.log("bcc:", mailOptions.bcc);
      console.log("from:", mailOptions.from);
      console.log("subject:", mailOptions.subject);
      console.log("in-reply-to:", mailOptions.inReplyTo);
      console.log("references:", mailOptions.headers["References"]);
      console.log("replyTo:", replyToAddress);
      console.log("==================");

      // send and persist result
      try {
        const info = await transporter.sendMail(mailOptions);
        console.log("mailer.sendMail OK:", {
          messageId: info?.messageId,
          accepted: info?.accepted,
          rejected: info?.rejected,
          response: info?.response,
        });

        ticket.lastOutbound = {
          to: mailOptions.to,
          bcc: mailOptions.bcc || undefined,
          messageId: info?.messageId,
          accepted: info?.accepted,
          rejected: info?.rejected,
          sentAt: new Date(),
        };
        await ticket.save();
      } catch (sendErr) {
        console.error("mailer.sendMail ERROR:", sendErr && (sendErr.message || sendErr));
        ticket.lastOutbound = {
          error: String(sendErr?.message || sendErr),
          attemptedTo: mailOptions.to,
          attemptedBcc: mailOptions.bcc || undefined,
          attemptedAt: new Date(),
        };
        await ticket.save();
      }
    }

    // Return populated ticket to client (fresh)
    const final = await Ticket.findById(ticketId)
      .populate("messages.sender", "name email avatar")
      .populate("customerId", "name email avatar")
      .populate("agentId", "name email avatar")
      .lean();

    return new Response(JSON.stringify({ success: true, ticket: final }), { status: 200 });
  } catch (err) {
    console.error("Message API Error (fatal):", err);
    return new Response(JSON.stringify({ success: false, msg: err?.message || "Server error" }), { status: 500 });
  }
}




// // app/api/helpdesk/tickets/[id]/message/route.js
// import { NextResponse } from "next/server";
// import connectDB from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import CompanyUser from "@/models/CompanyUser";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// const SAMPLE_AVATAR = "/mnt/data/c4bfcf65-19f2-400e-a777-0771674c53c6.png";

// export async function POST(req, { params }) {
//   try {
//     await connectDB();

//     // Auth
//     const token = getTokenFromHeader(req);
//     if (!token) return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });

//     let userPayload;
//     try {
//       userPayload = await verifyJWT(token);
//     } catch (err) {
//       return NextResponse.json({ success: false, msg: "Invalid token" }, { status: 401 });
//     }

//     const senderId = userPayload?.id || userPayload?._id;
//     if (!senderId) return NextResponse.json({ success: false, msg: "Invalid user in token" }, { status: 401 });

//     // Validate params & body
//     const ticketId = params?.id;
//     if (!ticketId) return NextResponse.json({ success: false, msg: "Ticket id missing" }, { status: 400 });

//     let body;
//     try {
//       body = await req.json();
//     } catch {
//       return NextResponse.json({ success: false, msg: "Invalid JSON body" }, { status: 400 });
//     }

//     const text = (body?.message || "").trim();
//     if (!text) return NextResponse.json({ success: false, msg: "Message is required" }, { status: 400 });

//     // Find ticket
//     const ticket = await Ticket.findById(ticketId);
//     if (!ticket) return NextResponse.json({ success: false, msg: "Ticket not found" }, { status: 404 });

//     // Append message
//     ticket.messages.push({ sender: senderId, message: text, aiSuggested: false });

//     // If sender is an agent, set ticket status/agent
//     const senderUser = await CompanyUser.findById(senderId).lean();
//     if (senderUser?.roles?.includes("agent")) {
//       // set in-progress if it was open
//       ticket.status = ticket.status === "open" ? "in-progress" : ticket.status;
//       // set agentId if not already set
//       ticket.agentId = ticket.agentId || senderId;
//     }

//     await ticket.save();

//     // Populate to return a friendly object
//     const populated = await Ticket.findById(ticketId)
//       .populate("messages.sender", "name email avatar")
//       .populate("customerId", "name email avatar")
//       .populate("agentId", "name email avatar")
//       .lean();

//     // ensure every message sender has an avatar (fallback)
//     if (populated?.messages?.length) {
//       populated.messages = populated.messages.map((m) => {
//         if (!m.sender) return m;
//         if (!m.sender.avatar) m.sender.avatar = SAMPLE_AVATAR;
//         return m;
//       });
//     }

//     if (populated?.customerId && !populated.customerId.avatar) populated.customerId.avatar = SAMPLE_AVATAR;
//     if (populated?.agentId && !populated.agentId.avatar) populated.agentId.avatar = SAMPLE_AVATAR;

//     return NextResponse.json({ success: true, ticket: populated, sampleAvatarUrl: SAMPLE_AVATAR });
//   } catch (err) {
//     console.error("POST /api/helpdesk/tickets/[id]/message error:", err);
//     return NextResponse.json({ success: false, msg: err?.message || "Server error" }, { status: 500 });
//   }
// }
// export async function GET(req, { params }) {
//   try {
//     await connectDB();
//     // ---- auth check ----
//     const token = getTokenFromHeader(req);
//     if (!token) {
//       return NextResponse.json({ success: false, msg: "Unauthorized: token missing" }, { status: 401 });
//     }   
//     try {
//       // verifyJWT should throw on invalid token
//       await verifyJWT(token);
//     } catch (err) {
//       return NextResponse.json({ success: false, msg: "Unauthorized: invalid token" }, { status: 401 });
//     }       
//     // ---- validate params ----
//     const id = params?.id;
//     if (!id) {
//       return NextResponse.json({ success: false, msg: "Ticket ID missing" }, { status: 400 });
//     }
//     // ---- fetch ticket ----
//     const ticket = await Ticket.findById(id)
//       .populate("messages.sender", "name email avatar")
//       .populate("customerId", "name email avatar")
//       .populate("agentId", "name email avatar");
//     if (!ticket) {
//       return NextResponse.json({ success: false, msg: "Ticket not found" }, { status: 404 });
//     }
//     // include sample avatar path so client can use it as fallback
//     return NextResponse.json({
//       success: true,
//       ticket,
//       sampleAvatarUrl: SAMPLE_AVATAR,
//     });
//   } catch (err) {
//     console.error("GET /api/helpdesk/tickets/[id]/message error:", err);
//     return NextResponse.json({ success: false, msg: err?.message || "Server error" }, { status: 500 });
//   } 
// }
