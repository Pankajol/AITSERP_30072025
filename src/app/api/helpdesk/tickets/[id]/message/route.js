export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import nodemailer from "nodemailer";

/* ================= EMAIL SETUP ================= */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/* ================= HELPERS ================= */

async function uploadAttachments(files, ticketId) {
  const uploaded = [];

  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const mime = file.type || "application/octet-stream";

      const base64 = `data:${mime};base64,${buffer.toString("base64")}`;

      const res = await cloudinary.uploader.upload(base64, {
        folder: `helpdesk/tickets/${ticketId}`,
        resource_type: "auto",
      });

      uploaded.push({
        filename: file.name,
        url: res.secure_url,
        contentType: mime,
        size: buffer.length,
      });
    } catch (err) {
      console.error("❌ Attachment upload failed:", err.message);
    }
  }

  return uploaded;
}

async function sendEmail({ to, subject, html }) {
  if (!to) return;

  await transporter.sendMail({
    from: `"Helpdesk" <${process.env.SMTP_FROM}>`,
    to,
    subject,
    html,
  });
}

/* ================= MAIN ================= */

export async function POST(req, { params }) {
  await dbConnect();

  const ticketId = params.id;

  /* ================= AUTH ================= */

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

  /* ================= PARSE FORM DATA ================= */

  const formData = await req.formData();
  const messageText = formData.get("message")?.toString().trim();
  const files = formData.getAll("attachments") || [];

  if (!messageText && files.length === 0) {
    return Response.json(
      { success: false, msg: "Message or attachment required" },
      { status: 400 }
    );
  }

  /* ================= FETCH TICKET ================= */

  const ticket = await Ticket.findById(ticketId)
    .populate("customerId", "name email")
    .populate("agentId", "name email");

  if (!ticket) {
    return Response.json(
      { success: false, msg: "Ticket not found" },
      { status: 404 }
    );
  }

  /* ================= CLOSED TICKET RULE ================= */

  let reopened = false;

  if (ticket.status === "closed") {
    if (senderType === "agent") {
      return Response.json(
        { success: false, msg: "Ticket already closed" },
        { status: 403 }
      );
    }

    ticket.status = "open";
    ticket.autoClosed = false;
    reopened = true;
  }

  /* ================= ATTACHMENTS ================= */

  const uploadedAttachments =
    files.length > 0
      ? await uploadAttachments(files, ticket._id)
      : [];

  /* ================= SAVE MESSAGE ================= */

  ticket.messages.push({
    senderType,
    sender: senderType === "agent" ? senderUser?.id : undefined,
    externalEmail:
      senderType === "customer" ? ticket.customerEmail : undefined,
    message: messageText || "",
    attachments: uploadedAttachments,
    createdAt: new Date(),
  });

  ticket.lastReplyAt = new Date();

  if (senderType === "customer") {
    ticket.lastCustomerReplyAt = new Date();
  }

  if (senderType === "agent") {
    ticket.lastAgentReplyAt = new Date();
  }

  await ticket.save();

  /* ================= EMAIL NOTIFICATION ================= */

  try {
    if (senderType === "agent") {
      // 📧 notify customer
      await sendEmail({
        to: ticket.customerEmail,
        subject: `Reply on Ticket: ${ticket.subject}`,
        html: `
          <p>Hello,</p>
          <p>You have received a reply on your ticket:</p>
          <blockquote>${messageText}</blockquote>
          <p>Regards,<br/>Support Team</p>
        `,
      });
    } else {
      // 📧 notify agent
      await sendEmail({
        to: ticket.agentId?.email,
        subject: `Customer replied: ${ticket.subject}`,
        html: `
          <p>Customer replied on ticket:</p>
          <blockquote>${messageText}</blockquote>
        `,
      });
    }
  } catch (err) {
    console.error("❌ Email send failed:", err.message);
  }

  /* ================= RETURN FRESH TICKET ================= */

  const freshTicket = await Ticket.findById(ticket._id)
    .populate("customerId", "name email avatar")
    .populate("agentId", "name email avatar")
    .populate("messages.sender", "name email avatar");

  return Response.json({
    success: true,
    reopened,
    ticket: freshTicket,
  });
}




// import dbConnect from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// export async function POST(req, { params }) {
//   await dbConnect();

//   const ticketId = params.id;
//   const body = await req.json();
//   const messageText = body.message?.trim();
//   const attachments = body.attachments || [];

//   if (!messageText) {
//     return Response.json(
//       { success: false, msg: "Message is required" },
//       { status: 400 }
//     );
//   }

//   /* ================= AUTH & SENDER TYPE ================= */

//   const token = getTokenFromHeader(req);
//   let senderType = "customer";
//   let senderUser = null;

//   if (token) {
//     try {
//       senderUser = verifyJWT(token);
//       senderType = "agent";
//     } catch {
//       senderType = "customer";
//     }
//   }

//   /* ================= FETCH TICKET ================= */

//   const ticket = await Ticket.findById(ticketId);
//   if (!ticket) {
//     return Response.json(
//       { success: false, msg: "Ticket not found" },
//       { status: 404 }
//     );
//   }

//   /* ================= CLOSED TICKET RULE ================= */

//   if (ticket.status === "closed") {
//     if (senderType === "agent") {
//       // ❌ Agent cannot reply to closed ticket
//       return Response.json(
//         { success: false, msg: "Ticket is already closed" },
//         { status: 403 }
//       );
//     }

//     // ✅ CUSTOMER REPLY → AUTO REOPEN
//     ticket.status = "open";
//     ticket.autoClosed = false;
//   }

//   /* ================= CREATE MESSAGE ================= */

//   const newMessage = {
//     senderType,
//     sender: senderType === "agent" ? senderUser.id : undefined,
//     externalEmail:
//       senderType === "customer" ? ticket.customerEmail : undefined,
//     message: messageText,
//     attachments,
//   };

//   ticket.messages.push(newMessage);

//   /* ================= SLA / TIMESTAMPS ================= */

//   ticket.lastReplyAt = new Date();

//   if (senderType === "customer") {
//     ticket.lastCustomerReplyAt = new Date();
//   }

//   if (senderType === "agent") {
//     ticket.lastAgentReplyAt = new Date();
//   }

//   await ticket.save();

//   /* ================= RESPONSE ================= */

//   return Response.json({
//     success: true,
//     reopened:
//       senderType === "customer" && ticket.status === "open",
//     ticket,
//   });
// }


