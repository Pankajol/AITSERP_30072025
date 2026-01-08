export const runtime = "nodejs";

import connectDB from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Company from "@/models/Company";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import nodemailer from "nodemailer";

/* ================= OUTLOOK SEND ================= */

async function sendOutlookMail({
  fromEmail,
  to,
  subject,
  html,
  messageId,
  inReplyTo,
  references,
  outlookConfig,
}) {
  const params = new URLSearchParams({
    client_id: outlookConfig.clientId,
    client_secret: outlookConfig.appPassword, // direct (no decrypt)
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${outlookConfig.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }
  );

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error("Outlook authentication failed");
  }

  const sendRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${fromEmail}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "HTML", content: html },
          toRecipients: [{ emailAddress: { address: to } }],
          internetMessageId: messageId,
          internetMessageHeaders: [
            { name: "In-Reply-To", value: inReplyTo },
            { name: "References", value: references },
          ],
        },
      }),
    }
  );

  if (!sendRes.ok) {
    const txt = await sendRes.text();
    throw new Error("Outlook sendMail failed: " + txt);
  }
}

/* ================= MAIN ================= */

export async function POST(req, context) {
  try {
    await connectDB();

    /* ✅ FIX: params async */
    const { id: ticketId } = await context.params;

    /* ================= AUTH ================= */
    const token = getTokenFromHeader(req);
    const userPayload = verifyJWT(token);
    if (!userPayload) {
      return Response.json(
        { success: false, msg: "Unauthorized" },
        { status: 401 }
      );
    }

    /* ================= FORM DATA ================= */
    const formData = await req.formData();
    const messageText = formData.get("message")?.toString().trim() || "";
    const files = formData.getAll("attachments") || [];

    if (!messageText && files.length === 0) {
      return Response.json(
        { success: false, msg: "Message or attachment required" },
        { status: 400 }
      );
    }

    /* ================= TICKET ================= */
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return Response.json(
        { success: false, msg: "Ticket not found" },
        { status: 404 }
      );
    }

    /* ================= COMPANY ================= */
    const company = await Company.findById(ticket.companyId).select(
      "+supportEmails.appPassword"
    );
    if (!company) {
      return Response.json(
        { success: false, msg: "Company not found" },
        { status: 404 }
      );
    }

    /* ================= SUPPORT EMAIL (ROBUST + FALLBACK) ================= */

    let emailAlias = ticket.emailAlias?.trim().toLowerCase();

    // 🔁 Fallback for old/manual tickets
    if (!emailAlias) {
      const fallback = company.supportEmails.find(
        (e) => e.inboundEnabled
      );
      emailAlias = fallback?.email?.toLowerCase();
    }

    if (!emailAlias) {
      return Response.json(
        {
          success: false,
          msg: "No support email configured for this company",
        },
        { status: 400 }
      );
    }

    const supportEmail = company.supportEmails.find(
      (e) => e.email?.trim().toLowerCase() === emailAlias
    );

    if (!supportEmail) {
      return Response.json(
        {
          success: false,
          msg: `Support email config not found for ${emailAlias}`,
        },
        { status: 400 }
      );
    }

    /* ================= ATTACHMENTS ================= */

    const uploadedAttachments = [];

    for (const file of files) {
      if (!file || !file.arrayBuffer) continue;

      const buffer = Buffer.from(await file.arrayBuffer());

      const res = await cloudinary.uploader.upload(
        `data:${file.type};base64,${buffer.toString("base64")}`,
        {
          folder: `helpdesk/tickets/${ticketId}`,
          resource_type: "auto",
        }
      );

      uploadedAttachments.push({
        filename: file.name,
        url: res.secure_url,
        contentType: file.type,
        size: buffer.length,
        emailBuffer: buffer,
      });
    }

    /* ================= THREAD ================= */

    const currentMessageId = `<${Date.now()}.${ticketId}@aitsind.com>`;
    const originalThreadId = ticket.emailThreadId;

    const htmlBody = messageText
      ? `<p>${messageText.replace(/\n/g, "<br>")}</p>`
      : "<p>(Attachment)</p>";

    /* ================= SEND EMAIL ================= */

    if (supportEmail.type === "outlook") {
      await sendOutlookMail({
        fromEmail: supportEmail.email,
        to: ticket.customerEmail,
        subject: `Re: ${ticket.subject}`,
        html: htmlBody,
        messageId: currentMessageId,
        inReplyTo: originalThreadId,
        references: originalThreadId,
        outlookConfig: supportEmail,
      });
    } else {
      const transporter = nodemailer.createTransport({
        service: supportEmail.type === "gmail" ? "gmail" : undefined,
        host: supportEmail.type === "smtp" ? "smtp.yourhost.com" : undefined,
        auth: {
          user: supportEmail.email,
          pass: supportEmail.appPassword,
        },
      });

      await transporter.sendMail({
        from: `${userPayload.name} <${supportEmail.email}>`,
        to: ticket.customerEmail,
        subject: `Re: ${ticket.subject}`,
        messageId: currentMessageId,
        inReplyTo: originalThreadId,
        references: [originalThreadId],
        html: htmlBody,
        attachments: uploadedAttachments.map((a) => ({
          filename: a.filename,
          content: a.emailBuffer,
          contentType: a.contentType,
        })),
      });
    }

    /* ================= SAVE ================= */

    ticket.messages.push({
      sender: userPayload.id,
      senderType: "agent",
      message: messageText,
      messageId: currentMessageId,
      attachments: uploadedAttachments.map(
        ({ emailBuffer, ...rest }) => rest
      ),
      createdAt: new Date(),
    });

    ticket.status = "in-progress";
    ticket.lastAgentReplyAt = new Date();
    await ticket.save();

    const updatedTicket = await Ticket.findById(ticketId)
      .populate("messages.sender", "name email avatar")
      .populate("agentId", "name email avatar")
      .lean();

    return Response.json({ success: true, ticket: updatedTicket });
  } catch (err) {
    console.error("Reply Error:", err);
    return Response.json(
      { success: false, msg: err.message },
      { status: 500 }
    );
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
