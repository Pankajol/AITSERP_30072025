export const runtime = "nodejs";
import connectDB from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Customer from "@/models/CustomerModel"; // 🔥 FIX: Customer model import kiya
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { transporter } from "@/lib/mailer";
import cloudinary from "@/lib/cloudinary";

export async function POST(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const userPayload = verifyJWT(token);
    if (!userPayload) return Response.json({ success: false, msg: "Unauthorized" }, { status: 401 });

    const ticketId = params.id;
    const formData = await req.formData();
    const messageText = formData.get("message")?.toString().trim();
    const files = formData.getAll("attachments");

    // Populate customerId tabhi kaam karega jab Customer model import ho
    const ticket = await Ticket.findById(ticketId).populate("customerId");
    if (!ticket) return Response.json({ success: false, msg: "Ticket not found" }, { status: 404 });

    // UPLOAD ATTACHMENTS
    const uploadedAttachments = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const res = await cloudinary.uploader.upload(`data:${file.type};base64,${buffer.toString("base64")}`, {
        folder: `helpdesk/tickets/${ticketId}`,
        resource_type: "auto",
      });
      uploadedAttachments.push({
        filename: file.name,
        url: res.secure_url,
        contentType: file.type,
        size: buffer.length,
        emailBuffer: buffer
      });
    }

    // EMAIL THREADING
    const currentMessageId = `<${Date.now()}.${ticketId}@yourdomain.com>`;
    const originalThreadId = ticket.emailThreadId;

    // SEND EMAIL
    await transporter.sendMail({
      from: `${userPayload.name} <${process.env.SMTP_USER}>`,
      to: ticket.customerEmail,
      subject: `Re: ${ticket.subject}`,
      messageId: currentMessageId,
      inReplyTo: originalThreadId,
      references: [originalThreadId],
      html: `<p>${messageText.replace(/\n/g, "<br>")}</p>`,
      attachments: uploadedAttachments.map(a => ({
        filename: a.filename,
        content: a.emailBuffer,
        contentType: a.contentType
      }))
    });

    // SAVE TO DB
    ticket.messages.push({
      sender: userPayload.id,
      senderType: "agent",
      message: messageText,
      messageId: currentMessageId,
      attachments: uploadedAttachments.map(({emailBuffer, ...rest}) => rest),
      createdAt: new Date(),
    });
    
    // Status update (Make sure "in-progress" is in your Ticket Schema enum)
    ticket.status = "in-progress";
    ticket.lastAgentReplyAt = new Date();
    await ticket.save();

    // Population for UI update
    const updatedTicket = await Ticket.findById(ticketId)
      .populate("messages.sender", "name email avatar")
      .populate("agentId", "name email avatar").lean();

    return Response.json({ success: true, ticket: updatedTicket });
  } catch (err) {
    console.error("Reply Error:", err);
    return Response.json({ success: false, msg: err.message }, { status: 500 });
  }
}
// export const runtime = "nodejs";
// import connectDB from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import CompanyUser from "@/models/CompanyUser";
// import Customer from "@/models/CustomerModel";
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

//     // EMAIL THREADING HEADERS
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
//       messageId: currentMessageId, // Zaroori hai threading ke liye
//       attachments: uploadedAttachments.map(({emailBuffer, ...rest}) => rest),
//       createdAt: new Date(),
//     });
    
//     ticket.status = "in-progress";
//     ticket.lastAgentReplyAt = new Date();
//     await ticket.save();

//     const updatedTicket = await Ticket.findById(ticketId)
//       .populate("messages.sender", "name email avatar")
//       .populate("agentId", "name email avatar").lean();

//     return Response.json({ success: true, ticket: updatedTicket });
//   } catch (err) {
//     return Response.json({ success: false, msg: err.message }, { status: 500 });
//   }
// }