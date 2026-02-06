export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Company from "@/models/Company";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

/* GRAPH TOKEN */
async function getGraphToken(se) {
  const params = new URLSearchParams({
    client_id: se.clientId,
    client_secret: se.appPassword,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });

  const r = await fetch(
    `https://login.microsoftonline.com/${se.tenantId}/oauth2/v2.0/token`,
    { method: "POST", body: params }
  );

  return (await r.json()).access_token;
}

export async function POST(req, { params }) {
  await dbConnect();

  const token = getTokenFromHeader(req);
  const user = verifyJWT(token);

  const { id } = params;
  const ticket = await Ticket.findById(id);
  const company = await Company.findById(ticket.companyId).select(
    "+supportEmails.appPassword"
  );

 const alias = (ticket.emailAlias || "").trim().toLowerCase();

const support = company.supportEmails.find(
  (e) => e.email?.trim().toLowerCase() === alias
);

if (!support) {
  console.log("❌ Support mailbox not matched");
  console.log("Ticket alias:", alias);
  console.log(
    "Company mailboxes:",
    company.supportEmails.map((e) => e.email)
  );

  throw new Error("Support mailbox missing");
}

  const lastCustomer = [...ticket.messages]
    .reverse()
    .find((m) => m.senderType === "customer" && m.graphMessageId);

  if (!lastCustomer) throw new Error("graphMessageId missing");

  const graphToken = await getGraphToken(support);

  const body = await req.formData();
  const text = body.get("message");

  await fetch(
    `https://graph.microsoft.com/v1.0/users/${support.email}/messages/${lastCustomer.graphMessageId}/reply`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${graphToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          body: { contentType: "HTML", content: text },
        },
      }),
    }
  );

  ticket.messages.push({
    senderType: "agent",
    sender: user.id,
    message: text,
  });

  ticket.lastAgentReplyAt = new Date();
  ticket.status = "in-progress";
  await ticket.save();

  return Response.json({ success: true });
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
