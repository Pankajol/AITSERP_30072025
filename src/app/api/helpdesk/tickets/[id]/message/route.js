// /app/api/helpdesk/tickets/[id]/message/route.js
import connectDB from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { transporter } from "@/lib/mailer"; // must export transporter from /lib/mailer.js

const SAMPLE_AVATAR = "/mnt/data/default-avatar.png";

export async function POST(req, context) {
  try {
    // Next.js: resolve params first
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
    const providedMessageId = body.messageId || ""; // optional message id if client passes

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
      // if user account exists and has email, prefer that; otherwise fallback to ticket.customerEmail
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

    // ----- determine correct recipient email and thread headers -----
    // Priority for recipient (when agent replies): 1) ticket.customerId.email 2) ticket.customerEmail 3) last message externalEmail
    // Priority for agent notification (when customer replies): ticket.agentId.email || SUPPORT_EMAIL fallback
    function findLastExternalEmail() {
      // iterate messages from end to find first externalEmail
      const msgs = (populated.messages || []).slice().reverse();
      for (const m of msgs) {
        if (m.externalEmail) return m.externalEmail;
        // sometimes sender is object with email
        if (m.sender && typeof m.sender === "object" && m.sender.email) return m.sender.email;
      }
      return null;
    }

    // find the messageId to use for threading
    // prefer ticket.emailThreadId (original thread id), otherwise last message's messageId
    const threadId = ticket.emailThreadId || (Array.isArray(populated.messages) && populated.messages[0]?.messageId) || null;
    const lastMsgId = (() => {
      const msgs = populated.messages || [];
      if (msgs.length === 0) return null;
      // last item
      const last = msgs[msgs.length - 1];
      return last.messageId || last.messageId || null;
    })();

    let mailTo = null;
    let inReplyToHeader = threadId || lastMsgId || undefined;
    let referencesHeader = undefined;

    if (isAgent) {
      // Agent replied -> send to customer
      mailTo = populated.customerId?.email || ticket.customerEmail || findLastExternalEmail();
    } else {
      // Customer replied -> notify assigned agent or fallback
      mailTo = populated.agentId?.email || process.env.SUPPORT_EMAIL || process.env.SMTP_USER;
    }

    // Build References header: include threadId and lastMsgId if present
    const refs = [];
    if (ticket.emailThreadId) refs.push(ticket.emailThreadId);
    if (lastMsgId && lastMsgId !== ticket.emailThreadId) refs.push(lastMsgId);
    if (refs.length) referencesHeader = refs.join(" ");

    // ----- Compose email options (debug-friendly) -----
    const fromAddress = process.env.SMTP_USER;
    const replyToAddress = process.env.REPLY_TO || process.env.SMTP_USER; // where customer replies should go (support mailbox)
    const subjectPrefix = isAgent ? `Reply on your ticket:` : `New customer reply on ticket:`;
    const subject = `${subjectPrefix} ${ticket.subject || "(no subject)"}`;

    const emailHtml = `
      <p>Hello ${populated.customerId?.name || populated.customerEmail || "Customer"},</p>
      <p>${isAgent ? "You have a new reply from support:" : "Customer replied:"}</p>
      <div style="padding:12px;border-radius:6px;background:#f6f8fa;border:1px solid #e1e4e8;">
        ${text.replace(/\n/g, "<br>")}
      </div>
      <p>Ticket: <strong>${ticket.subject || ""}</strong></p>
      <p>--</p>
      <p>This message sent by your support portal.</p>
    `;

    // If no recipient determined, skip sending but still return success (don't break flow)
    if (!mailTo) {
      console.warn("No recipient found for email notification — skipping sendMail. ticketId:", ticketId);
    } else {
      // Compose mail options with In-Reply-To and References to keep the thread
      const mailOptions = {
        from: fromAddress,
        to: mailTo,
        subject,
        html: emailHtml,
        replyTo: replyToAddress,
        headers: {},
      };

      if (inReplyToHeader) {
        mailOptions.inReplyTo = inReplyToHeader;
        mailOptions.headers["In-Reply-To"] = inReplyToHeader;
      }
      if (referencesHeader) {
        mailOptions.headers["References"] = referencesHeader;
      }

      // DEBUG: log mail options (DO NOT log secrets)
      console.log("=== MAIL DEBUG ===");
      console.log("to:", mailTo);
      console.log("from:", fromAddress);
      console.log("subject:", mailOptions.subject);
      console.log("in-reply-to:", mailOptions.inReplyTo);
      console.log("references:", mailOptions.headers["References"]);
      console.log("replyTo:", replyToAddress);
      console.log("==================");

      // send and log result
      try {
        const info = await transporter.sendMail(mailOptions);
        console.log("mailer.sendMail OK:", {
          messageId: info?.messageId,
          accepted: info?.accepted,
          rejected: info?.rejected,
          response: info?.response,
        });

        // Save email send metadata into ticket (optional): you can store lastOutbound at least
        ticket.lastOutbound = {
          to: mailTo,
          messageId: info?.messageId,
          accepted: info?.accepted,
          rejected: info?.rejected,
          sentAt: new Date(),
        };
        // persist metadata (non-blocking)
        await ticket.save();
      } catch (sendErr) {
        console.error("mailer.sendMail ERROR:", sendErr && (sendErr.message || sendErr));
        // don't throw — we still return success to caller; but save error into ticket logs optionally
        ticket.lastOutbound = {
          error: String(sendErr?.message || sendErr),
          attemptedTo: mailTo,
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
