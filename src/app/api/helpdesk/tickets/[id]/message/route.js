export const runtime = "nodejs";

import connectDB from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { transporter } from "@/lib/mailer";
import cloudinary from "@/lib/cloudinary";

const SAMPLE_AVATAR = "/mnt/data/default-avatar.png";

/* ================= HELPERS ================= */

function makePlusAddress(smtpUser, ticketId) {
  if (!smtpUser || !ticketId) return smtpUser;
  const parts = String(smtpUser).split("@");
  if (parts.length !== 2) return smtpUser;
  return `${parts[0]}+${ticketId}@${parts[1]}`;
}

function normalizeMessageId(id) {
  if (!id) return null;
  const s = String(id).replace(/^<|>$/g, "").trim();
  return s ? `<${s}>` : null;
}

/* ================= ROUTE ================= */

export async function POST(req, { params }) {
  try {
    await connectDB();

    /* ---------- AUTH ---------- */
    const token = getTokenFromHeader(req);
    if (!token) {
      return Response.json({ success: false, msg: "Unauthorized" }, { status: 401 });
    }

    const userPayload = verifyJWT(token);
    const senderId = userPayload?.id;
    const senderName = userPayload?.name || "Support";

    const ticketId = params?.id;
    if (!ticketId) {
      return Response.json({ success: false, msg: "Ticket id missing" }, { status: 400 });
    }

    /* ---------- READ FORM DATA (IMPORTANT) ---------- */
    const formData = await req.formData();
    const messageText = formData.get("message")?.toString().trim();
    const files = formData.getAll("attachments");

    if (!messageText) {
      return Response.json({ success: false, msg: "Message is required" }, { status: 400 });
    }

    /* ---------- LOAD TICKET ---------- */
    const ticket = await Ticket.findById(ticketId)
      .populate("customerId", "email name avatar")
      .populate("agentId", "email name avatar");

    if (!ticket) {
      return Response.json({ success: false, msg: "Ticket not found" }, { status: 404 });
    }

    /* ---------- SENDER TYPE ---------- */
    const senderUser = await CompanyUser.findById(senderId).lean().catch(() => null);
    const isAgent = senderUser?.roles?.includes("agent");
    const senderType = isAgent ? "agent" : "customer";

    /* ---------- UPLOAD ATTACHMENTS ---------- */
    const uploadedAttachments = [];

    for (const file of files) {
      if (!file || !file.name) continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

      const res = await cloudinary.uploader.upload(base64, {
        folder: `helpdesk/tickets/${ticketId}`,
        resource_type: "auto",
      });

      uploadedAttachments.push({
        filename: file.name,
        url: res.secure_url,
        contentType: file.type,
        size: buffer.length,
        emailBuffer: buffer, // for email attachment
      });
    }

    /* ---------- SAVE MESSAGE ---------- */
    ticket.messages.push({
      sender: senderId,
      senderType,
      message: messageText,
      attachments: uploadedAttachments.map(a => ({
        filename: a.filename,
        url: a.url,
        contentType: a.contentType,
        size: a.size,
      })),
      createdAt: new Date(),
    });

    ticket.lastReplyAt = new Date();
    if (isAgent) {
      ticket.lastAgentReplyAt = new Date();
      if (ticket.status === "open") ticket.status = "in-progress";
      ticket.agentId = ticket.agentId || senderId;
    } else {
      ticket.lastCustomerReplyAt = new Date();
    }

    await ticket.save();

    /* ---------- EMAIL SEND ---------- */
    const smtpUser = process.env.SMTP_USER;
    const supportEmail = process.env.SUPPORT_EMAIL || smtpUser;
    const mailTo = ticket.customerEmail;

    if (mailTo && smtpUser) {
      const replyTo = makePlusAddress(smtpUser, ticket._id);

      await transporter.sendMail({
        from: `${senderName} <${smtpUser}>`,
        to: mailTo,
        replyTo,
        subject: `Reply on ticket: ${ticket.subject}`,
        html: `
          <p>Hello ${ticket.customerEmail},</p>
          <p>${isAgent ? "Support replied:" : "Customer replied:"}</p>
          <div style="padding:12px;border:1px solid #ddd;border-radius:6px;">
            ${messageText.replace(/\n/g, "<br>")}
          </div>
          ${
            uploadedAttachments.length
              ? `<hr/><p><b>Attachments:</b></p>
                 <ul>
                   ${uploadedAttachments
                     .map(a => `<li><a href="${a.url}">${a.filename}</a></li>`)
                     .join("")}
                 </ul>`
              : ""
          }
        `,
        attachments: uploadedAttachments.map(a => ({
          filename: a.filename,
          content: a.emailBuffer,
          contentType: a.contentType,
        })),
        bcc: supportEmail !== mailTo ? supportEmail : undefined,
      });
    }

    /* ---------- CLEAN BUFFER ---------- */
    uploadedAttachments.forEach(a => delete a.emailBuffer);

    /* ---------- RESPONSE ---------- */
    const final = await Ticket.findById(ticketId)
      .populate("messages.sender", "name email avatar")
      .populate("customerId", "name email avatar")
      .populate("agentId", "name email avatar")
      .lean();

    return Response.json({ success: true, ticket: final });

  } catch (err) {
    console.error("Message API Error:", err);
    return Response.json({ success: false, msg: err.message }, { status: 500 });
  }
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
