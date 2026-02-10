export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Customer from "@/models/CustomerModel";
import Company from "@/models/Company";
import { getNextAvailableAgent } from "@/utils/getNextAvailableAgent";
import { analyzeSentimentAI } from "@/utils/aiSentiment";
import cloudinary from "@/lib/cloudinary";

/* ================= HELPERS ================= */

const clean = (v) => String(v || "").trim().toLowerCase();

function cleanHtml(v) {
  return String(v || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .split(/From:\s|Sent:\s|To:\s|Subject:\s/i)[0]
    .trim();
}

/* ================= ATTACHMENT UPLOADER ================= */

async function uploadAttachments(raw = [], ticketId) {
  const uploaded = [];

  for (const a of raw) {
    try {
      if (!a?.content || !a?.contentType) continue;

      const buffer = Buffer.from(a.content, "base64");

      const res = await cloudinary.uploader.upload(
        `data:${a.contentType};base64,${buffer.toString("base64")}`,
        {
          folder: `helpdesk/tickets/${ticketId}`,
          resource_type: "auto",
        }
      );

      uploaded.push({
        filename: a.filename || "attachment",
        url: res.secure_url,
        contentType: a.contentType,
        size: buffer.length,
      });
    } catch (err) {
      console.error("Attachment upload failed:", err.message);
    }
  }

  return uploaded;
}

/* ================= MAIN ================= */

export async function POST(req) {
  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.get("secret") !== process.env.INBOUND_EMAIL_SECRET) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const raw = await req.json();

    const from = clean(raw.from);
    const to = clean(raw.to);
    const subject = raw.subject || "";
    const html = raw.html || "";

    const conversationId = raw.conversationId;
    const graphMessageId = raw.graphMessageId;
    const internetMessageId = raw.messageId;

    if (!conversationId) throw new Error("conversationId missing");

    const cleanBody = cleanHtml(html);

    const searchIds = [
      conversationId,
      graphMessageId,
      internetMessageId,
    ].filter(Boolean);

    /* ================= DUPLICATE GUARD ================= */

    if (internetMessageId) {
      const alreadyExists = await Ticket.findOne({
        "messages.internetMessageId": internetMessageId,
      });

      if (alreadyExists) {
        console.log("⚠️ Duplicate ignored:", internetMessageId);
        return Response.json({ success: true, duplicate: true });
      }
    }

    /* ================= FIND EXISTING ================= */

    let ticket = null;

    if (searchIds.length) {
      ticket = await Ticket.findOne({
        $or: [
          { emailThreadId: { $in: searchIds } },
          { "messages.messageId": { $in: searchIds } },
        ],
      });
    }

    /* ================= REPLY ================= */

    if (ticket) {
      const uploaded = await uploadAttachments(
        raw.attachments || [],
        ticket._id
      );

      ticket.messages.push({
        senderType: "customer",
        externalEmail: from,
        message: cleanBody,
        graphMessageId,
        internetMessageId,
        messageId: internetMessageId,
        attachments: uploaded,
        createdAt: new Date(),
      });

      ticket.lastCustomerReplyAt = new Date();
      ticket.lastReplyAt = new Date();

      // 🔥 reopen closed ticket
      if (ticket.status === "closed") {
        ticket.status = "open";
        ticket.autoClosed = false;

        if (!ticket.agentId) {
          const customer = await Customer.findById(ticket.customerId);
          if (customer) {
            ticket.agentId = await getNextAvailableAgent(customer);
          }
        }
      }

      await ticket.save();
      return Response.json({ success: true });
    }

    /* ================= NEW TICKET ================= */

    const company = await Company.findOne({
      "supportEmails.email": to,
    });

    if (!company) throw new Error("Mailbox not registered");

    const customer = await Customer.findOne({ emailId: from });
    if (!customer) throw new Error("Customer not registered");

    const sentiment = await analyzeSentimentAI(cleanBody);
    const agentId = await getNextAvailableAgent(customer);

    ticket = await Ticket.create({
      companyId: company._id,
      customerId: customer._id,
      customerEmail: from,
      subject,
      agentId: agentId || null,
      sentiment,
      emailAlias: to,
      emailThreadId: conversationId,
      source: "email",
      status: "open",
      messages: [],
    });

    const uploaded = await uploadAttachments(
      raw.attachments || [],
      ticket._id
    );

    ticket.messages.push({
      senderType: "customer",
      externalEmail: from,
      message: cleanBody,
      graphMessageId,
      internetMessageId,
      messageId: internetMessageId,
      sentiment,
      attachments: uploaded,
      createdAt: new Date(),
    });

    ticket.lastCustomerReplyAt = new Date();
    ticket.lastReplyAt = new Date();

    await ticket.save();

    return Response.json({ success: true });
  } catch (e) {
    console.error("INBOUND:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}







// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import Customer from "@/models/CustomerModel";
// import Company from "@/models/Company";
// import cloudinary from "@/lib/cloudinary";

// /* helpers */
// const clean = (v) => String(v || "").trim().toLowerCase();

// export async function POST(req) {
//   try {
//     const { searchParams } = new URL(req.url);
//     if (searchParams.get("secret") !== process.env.INBOUND_EMAIL_SECRET) {
//       return Response.json({ error: "unauthorized" }, { status: 401 });
//     }

//     await dbConnect();
//     const raw = await req.json();

//     const from = clean(raw.from);
//     const to = clean(raw.to);
//     const subject = raw.subject || "";
//     const html = raw.html || "";

//     const conversationId = raw.conversationId;
//     const graphMessageId = raw.graphMessageId;
//     const internetMessageId = raw.messageId;

//     const searchIds = [
//   conversationId,
//   graphMessageId,
//   internetMessageId,
// ].filter(Boolean);

// // 🔐 DUPLICATE MESSAGE GUARD (Outlook double webhook)
// const alreadyExists = await Ticket.findOne({
//   "messages.internetMessageId": internetMessageId,
// });

// if (alreadyExists) {
//   console.log("⚠️ Duplicate email ignored:", internetMessageId);
//   return Response.json({ success: true, duplicate: true });
// }


//     if (!conversationId) throw new Error("conversationId missing");

//     /* ================= FIND EXISTING ================= */

//     // let ticket = await Ticket.findOne({
//     //   emailThreadId: conversationId,
//     // });
//     let ticket = null;
// if (searchIds.length) {
//   ticket = await Ticket.findOne({
//     $or: [
//       { emailThreadId: { $in: searchIds } },
//       { "messages.messageId": { $in: searchIds } },
//     ],
//   });
// }

// // 🔐 DUPLICATE MESSAGE GUARD
// // const alreadyExists = await Ticket.findOne({
// //   "messages.internetMessageId": messageId,
// // });

// // if (alreadyExists) {
// //   console.log("⚠️ Duplicate email ignored:", messageId);
// //   return Response.json({ success: true, duplicate: true });
// // }


//   const cleanBody = html
//   .replace(/<style[\s\S]*?<\/style>/gi, "")
//   .replace(/<script[\s\S]*?<\/script>/gi, "")
//   .replace(/<\/?[^>]+>/g, "")
//   .replace(/&nbsp;/g, " ")
//   .split(/From:\s|Sent:\s|To:\s|Subject:\s/i)[0]
//   .trim();

//     /* ================= REPLY ================= */
//     if (ticket) {
//       ticket.messages.push({
//         senderType: "customer",
//         externalEmail: from,
//         message: cleanBody,
//         graphMessageId,
//         internetMessageId,
//         messageId: internetMessageId,
//         createdAt: new Date(),
//       });

//       ticket.lastCustomerReplyAt = new Date();
//       await ticket.save();

//       return Response.json({ success: true });
//     }

//     /* ================= NEW ================= */

//     const company = await Company.findOne({
//       "supportEmails.email": to,
//     });

//     if (!company) throw new Error("Mailbox not registered");

//     const customer = await Customer.findOne({ emailId: from });
//     if (!customer) throw new Error("Customer not registered");

//     ticket = await Ticket.create({
//       companyId: company._id,
//       customerId: customer._id,
//       customerEmail: from,
//       subject,
//       emailAlias: to,
//       emailThreadId: conversationId,
//       messages: [],
//     });


  

//     ticket.messages.push({
//       senderType: "customer",
//       externalEmail: from,
//       message: cleanBody,
//       graphMessageId,
//       internetMessageId,
//       messageId: internetMessageId,
//     });

//     await ticket.save();

//     return Response.json({ success: true });
//   } catch (e) {
//     console.error("INBOUND:", e);
//     return Response.json({ error: e.message }, { status: 500 });
//   }
// }



