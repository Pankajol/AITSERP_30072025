export const runtime = "nodejs";

import connectDB from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Company from "@/models/Company";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import nodemailer from "nodemailer";

/* ================= GRAPH TOKEN ================= */
async function getGraphToken(se) {
  const params = new URLSearchParams({
    client_id: se.clientId,
    client_secret: se.appPassword,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${se.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }
  );

  const data = await res.json();
  if (!data.access_token) throw new Error("Graph auth failed");
  return data.access_token;
}

/* ================= OUTLOOK REPLY ================= */
async function sendOutlookReply({ supportEmail, ticket, html }) {
  const token = await getGraphToken(supportEmail);

  // 🔥 MUST use Graph message id (not internet id)
  const lastCustomer = [...ticket.messages]
    .reverse()
    .find((m) => m.senderType === "customer" && m.graphMessageId);

  if (!lastCustomer?.graphMessageId) {
    throw new Error("No graphMessageId found for Outlook reply");
  }

  const graphId = lastCustomer.graphMessageId;

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${supportEmail.email}/messages/${graphId}/reply`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          body: {
            contentType: "HTML",
            content: html,
          },
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error("Outlook reply failed: " + (await res.text()));
  }
}

/* ================= MAIN ================= */
export async function POST(req, context) {
  try {
    await connectDB();

    const { id: ticketId } = await context.params;

    const token = getTokenFromHeader(req);
    const userPayload = verifyJWT(token);
    if (!userPayload) {
      return Response.json({ success: false }, { status: 401 });
    }

    const formData = await req.formData();
    const messageText = formData.get("message")?.toString().trim() || "";
    const files = formData.getAll("attachments") || [];

    if (!messageText && !files.length) {
      return Response.json({ success: false, msg: "Empty reply" }, { status: 400 });
    }

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return Response.json({ success: false, msg: "Ticket not found" }, { status: 404 });
    }

    const company = await Company.findById(ticket.companyId).select("+supportEmails.appPassword");

    const supportEmail = company.supportEmails.find(
      (e) => e.email?.toLowerCase() === ticket.emailAlias?.toLowerCase()
    );

    if (!supportEmail) {
      return Response.json({ success: false, msg: "Support mailbox missing" }, { status: 400 });
    }

    /* ================= ATTACHMENTS ================= */
    const uploaded = [];

    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer());
      const res = await cloudinary.uploader.upload(
        `data:${file.type};base64,${buf.toString("base64")}`,
        { folder: `helpdesk/${ticketId}` }
      );

      uploaded.push({
        filename: file.name,
        url: res.secure_url,
        contentType: file.type,
        size: buf.length,
      });
    }

    const html = `<p>${messageText.replace(/\n/g, "<br>")}</p>`;

    /* ================= SEND ================= */

    if (supportEmail.type === "outlook") {
      await sendOutlookReply({
        supportEmail,
        ticket,
        html,
      });
    } else {
      const transporter = nodemailer.createTransport({
        host: supportEmail.type === "gmail" ? "smtp.gmail.com" : process.env.SMTP_HOST,
        port: 587,
        secure: false,
        auth: {
          user: supportEmail.email,
          pass: supportEmail.appPassword,
        },
      });

      await transporter.sendMail({
        from: supportEmail.email,
        to: ticket.customerEmail,
        subject: `Re: ${ticket.subject}`,
        html,
      });
    }

    /* ================= SAVE ================= */

    ticket.messages.push({
      sender: userPayload.id,
      senderType: "agent",
      message: messageText,
      attachments: uploaded,
      createdAt: new Date(),
    });

    ticket.status = "in-progress";
    ticket.lastAgentReplyAt = new Date();
    await ticket.save();

    const updated = await Ticket.findById(ticketId)
      .populate("messages.sender", "name email avatar")
      .lean();

    return Response.json({ success: true, ticket: updated });
  } catch (err) {
    console.error("Reply Error:", err);
    return Response.json({ success: false, msg: err.message }, { status: 500 });
  }
}




// export const runtime = "nodejs";
// import connectDB from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import Customer from "@/models/CustomerModel"; // 🔥 FIX: Customer model import kiya
// import CompanyUser from "@/models/CompanyUser";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { transporter } from "@/lib/mailer";
// import cloudinary from "@/lib/cloudinary";

// export async function POST(req, { params }) {
//   try {
//     await connectDB();
//     const token = getTokenFromHeader(req);
//     const userPayload = verifyJWT(token);
//     if (!userPayload) return Response.json({ success: false, msg: "Unauthorized" }, { status: 401 });

//     const ticketId = params.id;
//     const formData = await req.formData();
//     const messageText = formData.get("message")?.toString().trim();
//     const files = formData.getAll("attachments");

//     // Populate customerId tabhi kaam karega jab Customer model import ho
//     const ticket = await Ticket.findById(ticketId).populate("customerId");
//     if (!ticket) return Response.json({ success: false, msg: "Ticket not found" }, { status: 404 });

//     // UPLOAD ATTACHMENTS
//     const uploadedAttachments = [];
//     for (const file of files) {
//       const buffer = Buffer.from(await file.arrayBuffer());
//       const res = await cloudinary.uploader.upload(`data:${file.type};base64,${buffer.toString("base64")}`, {
//         folder: `helpdesk/tickets/${ticketId}`,
//         resource_type: "auto",
//       });
//       uploadedAttachments.push({
//         filename: file.name,
//         url: res.secure_url,
//         contentType: file.type,
//         size: buffer.length,
//         emailBuffer: buffer
//       });
//     }

//     // EMAIL THREADING
//     const currentMessageId = `<${Date.now()}.${ticketId}@yourdomain.com>`;
//     const originalThreadId = ticket.emailThreadId;

//     // SEND EMAIL
//     await transporter.sendMail({
//       from: `${userPayload.name} <${process.env.SMTP_USER}>`,
//       to: ticket.customerEmail,
//       subject: `Re: ${ticket.subject}`,
//       messageId: currentMessageId,
//       inReplyTo: originalThreadId,
//       references: [originalThreadId],
//       html: `<p>${messageText.replace(/\n/g, "<br>")}</p>`,
//       attachments: uploadedAttachments.map(a => ({
//         filename: a.filename,
//         content: a.emailBuffer,
//         contentType: a.contentType
//       }))
//     });

//     // SAVE TO DB
//     ticket.messages.push({
//       sender: userPayload.id,
//       senderType: "agent",
//       message: messageText,
//       messageId: currentMessageId,
//       attachments: uploadedAttachments.map(({emailBuffer, ...rest}) => rest),
//       createdAt: new Date(),
//     });
    
//     // Status update (Make sure "in-progress" is in your Ticket Schema enum)
//     ticket.status = "in-progress";
//     ticket.lastAgentReplyAt = new Date();
//     await ticket.save();

//     // Population for UI update
//     const updatedTicket = await Ticket.findById(ticketId)
//       .populate("messages.sender", "name email avatar")
//       .populate("agentId", "name email avatar").lean();

//     return Response.json({ success: true, ticket: updatedTicket });
//   } catch (err) {
//     console.error("Reply Error:", err);
//     return Response.json({ success: false, msg: err.message }, { status: 500 });
//   }
// }
