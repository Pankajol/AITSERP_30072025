export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Customer from "@/models/CustomerModel";
import Company from "@/models/Company";
import CompanyUser from "@/models/CompanyUser";
import { getNextAvailableAgent } from "@/utils/getNextAvailableAgent";
import { analyzeSentimentAI } from "@/utils/aiSentiment";
import cloudinary from "@/lib/cloudinary";

/* ================= HELPERS ================= */

const clean = (v) => String(v || "").trim().toLowerCase();

/* ================= ULTRA MAIL BODY CLEANER ================= */

function cleanHtml(v) {
  if (!v) return "";

  let text = String(v)

    /* 🔥 remove style/script */
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")

    /* 🔥 convert breaks to newline */
    .replace(/<br\s*\/?>/gi, "\n")

    /* 🔥 remove html tags */
    .replace(/<\/?[^>]+>/g, "")

    /* 🔥 html entities */
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")

    .trim();

  /* ================= CUT OUTLOOK / GMAIL REPLY HEADER ================= */
  text = text.split(/From:\s|Sent:\s|To:\s|Subject:\s/i)[0];

  /* ================= REMOVE SIGNATURE ================= */
  const signaturePatterns = [
    /thanks\s*&?\s*regards[\s\S]*/i,
    /best\s*regards[\s\S]*/i,
    /warm\s*regards[\s\S]*/i,
    /kind\s*regards[\s\S]*/i,
    /regards[\s\S]*/i,
    /sent\s*from\s*my[\s\S]*/i,
    /--\s*\n[\s\S]*/i,
  ];

  for (const pattern of signaturePatterns) {
    if (pattern.test(text)) {
      text = text.split(pattern)[0];
      break;
    }
  }

  /* ================= CLEAN EXTRA SPACES ================= */
  text = text
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}


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
  if (!data.access_token) throw new Error("Graph token failed");
  return data.access_token;
}

/* ================= OUTLOOK AUTO MAIL ================= */

async function sendOutlookAutoReply({ to, subject, html, companyEmail }) {
  const company = await Company.findOne({
    "supportEmails.email": companyEmail,
  }).select("+supportEmails.appPassword");

  if (!company) return;

  const se = company.supportEmails.find(
    (e) => e.email?.toLowerCase() === companyEmail.toLowerCase()
  );
  if (!se) return;

  const token = await getGraphToken(se);

  await fetch(
    `https://graph.microsoft.com/v1.0/users/${se.email}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "HTML", content: html },
          toRecipients: [{ emailAddress: { address: to } }],
        },
        saveToSentItems: true,
      }),
    }
  );
}


/* ================= SEND MAIL TO AGENT ================= */

async function sendAgentAssignedMail({ agentEmail, ticket, companyEmail }) {
  try {
    const company = await Company.findOne({
      "supportEmails.email": companyEmail,
    }).select("+supportEmails.appPassword");

    if (!company) return;

    const se = company.supportEmails.find(
      (e) => e.email?.toLowerCase() === companyEmail.toLowerCase()
    );

    if (!se) return;

    const token = await getGraphToken(se);

    await fetch(
      `https://graph.microsoft.com/v1.0/users/${se.email}/sendMail`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            subject: `🎫 New Ticket Assigned #${ticket._id}`,
            body: {
              contentType: "HTML",
              content: `
                <p>Hello,</p>
                <p>A new support ticket has been assigned to you.</p>

                <p><b>Ticket ID:</b> ${ticket._id}</p>
                <p><b>Customer:</b> ${ticket.customerEmail}</p>
                <p><b>Subject:</b> ${ticket.subject}</p>

                <p>Please login to helpdesk and respond.</p>
              `,
            },
            toRecipients: [
              {
                emailAddress: { address: agentEmail },
              },
            ],
          },
          saveToSentItems: true,
        }),
      }
    );
  } catch (err) {
    console.log("⚠️ Agent mail send failed:", err.message);
  }
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
    const subject = raw.subject || "No Subject";
    const html = raw.html || "";

    const conversationId = raw.conversationId;
    const graphMessageId = raw.graphMessageId;
    const internetMessageId = raw.messageId;


//     const from = clean(raw.from);
// const to = clean(raw.to);

// 🚫 1. STOP SELF MAIL LOOP (support → support)
if (from === to) {
  console.log("⚠️ Ignored self email loop");
  return Response.json({ ignored: true });
}

// 🚫 2. IGNORE AUTO GENERATED MAILS (Outlook auto reply)
const headers = raw.headers || {};
const autoSubmitted = headers["auto-submitted"] || "";

if (String(autoSubmitted).toLowerCase().includes("auto")) {
  console.log("⚠️ Auto generated mail ignored");
  return Response.json({ ignored: true });
}

// 🚫 3. IGNORE SUPPORT EMAIL SENDER (VERY IMPORTANT)
const companyCheck = await Company.findOne({
  "supportEmails.email": to,
});

const isSupportSender = companyCheck?.supportEmails?.some(
  (e) => clean(e.email) === clean(from)
);

if (isSupportSender) {
  console.log("⚠️ Support email loop blocked");
  return Response.json({ ignored: true });
}


    if (!conversationId) throw new Error("conversationId missing");

    const bodyText = cleanHtml(html);

    const searchIds = [conversationId, graphMessageId, internetMessageId].filter(Boolean);

    /* ================= DUPLICATE GUARD ================= */

    if (internetMessageId) {
      const exists = await Ticket.findOne({
        "messages.internetMessageId": internetMessageId,
      });
      if (exists) {
        console.log("⚠️ Duplicate ignored:", internetMessageId);
        return Response.json({ success: true, duplicate: true });
      }
    }

    /* ================= FIND EXISTING TICKET ================= */

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
      const uploaded = await uploadAttachments(raw.attachments || [], ticket._id);

      ticket.messages.push({
        senderType: "customer",
        externalEmail: from,
        message: bodyText,
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

        if (!ticket.agentId && ticket.customerId) {
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

    const customer = await Customer.findOne({
      companyId: company._id, 
      $or: [{ emailId: from }, { "contactEmails.email": from }],
    });

    /* UNKNOWN SENDER */
    if (!customer) {
      await sendOutlookAutoReply({
        to: from,
        subject,
        html: `
          <p>Hello,</p>
          <p>Your email was received but you are not registered in our support system.</p>
          <p>Please contact admin.</p>
        `,
        companyEmail: to,
      });

      return Response.json({ success: true, unknown: true });
    }

    const sentiment = await analyzeSentimentAI(bodyText);
    let agentId = await getNextAvailableAgent(customer);

    if (agentId) {
  const agent = await CompanyUser.findOne({
    _id: agentId,
    companyId: company._id,   // HARD VERIFY
  });

  if (!agent) {
    console.log("🚫 Cross company agent blocked");
    agentId = null;
  }
}

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

    const uploaded = await uploadAttachments(raw.attachments || [], ticket._id);

    ticket.messages.push({
      senderType: "customer",
      externalEmail: from,
      message: bodyText,
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

    /* CUSTOMER CONFIRMATION MAIL */
    await sendOutlookAutoReply({
      to: from,
      subject: `Ticket Created – ${subject}`,
      html: `
        <p>Your ticket has been created successfully.</p>
        <p><b>Ticket ID:</b> ${ticket._id}</p>
      `,
      companyEmail: to,
    });
   /* ================= SEND MAIL TO AGENT ================= */
    if (ticket.agentId) {
  const agent = await CompanyUser.findById(ticket.agentId);

  if (agent?.email) {
    await sendAgentAssignedMail({
      agentEmail: agent.email,
      ticket,
      companyEmail: to,
    });
  }
}

    return Response.json({ success: true });
  } catch (e) {
    console.error("INBOUND:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}



// flow currect 

// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import Customer from "@/models/CustomerModel";
// import Company from "@/models/Company";
// import { getNextAvailableAgent } from "@/utils/getNextAvailableAgent";
// import { analyzeSentimentAI } from "@/utils/aiSentiment";
// import cloudinary from "@/lib/cloudinary";

// /* ================= HELPERS ================= */

// const clean = (v) => String(v || "").trim().toLowerCase();

// function cleanHtml(v) {
//   return String(v || "")
//     .replace(/<style[\s\S]*?<\/style>/gi, "")
//     .replace(/<script[\s\S]*?<\/script>/gi, "")
//     .replace(/<\/?[^>]+>/g, "")
//     .replace(/&nbsp;/g, " ")
//     .split(/From:\s|Sent:\s|To:\s|Subject:\s/i)[0]
//     .trim();
// }

// /* ================= ATTACHMENT UPLOADER ================= */

// async function uploadAttachments(raw = [], ticketId) {
//   const uploaded = [];

//   for (const a of raw) {
//     try {
//       if (!a?.content || !a?.contentType) continue;

//       const buffer = Buffer.from(a.content, "base64");

//       const res = await cloudinary.uploader.upload(
//         `data:${a.contentType};base64,${buffer.toString("base64")}`,
//         {
//           folder: `helpdesk/tickets/${ticketId}`,
//           resource_type: "auto",
//         }
//       );

//       uploaded.push({
//         filename: a.filename || "attachment",
//         url: res.secure_url,
//         contentType: a.contentType,
//         size: buffer.length,
//       });
//     } catch (err) {
//       console.error("Attachment upload failed:", err.message);
//     }
//   }

//   return uploaded;
// }

// /* ================= MAIN ================= */

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

//     if (!conversationId) throw new Error("conversationId missing");

//     const cleanBody = cleanHtml(html);

//     const searchIds = [
//       conversationId,
//       graphMessageId,
//       internetMessageId,
//     ].filter(Boolean);

//     /* ================= DUPLICATE GUARD ================= */

//     if (internetMessageId) {
//       const alreadyExists = await Ticket.findOne({
//         "messages.internetMessageId": internetMessageId,
//       });

//       if (alreadyExists) {
//         console.log("⚠️ Duplicate ignored:", internetMessageId);
//         return Response.json({ success: true, duplicate: true });
//       }
//     }

//     /* ================= FIND EXISTING ================= */

//     let ticket = null;

//     if (searchIds.length) {
//       ticket = await Ticket.findOne({
//         $or: [
//           { emailThreadId: { $in: searchIds } },
//           { "messages.messageId": { $in: searchIds } },
//         ],
//       });
//     }

//     /* ================= REPLY ================= */

//     if (ticket) {
//       const uploaded = await uploadAttachments(
//         raw.attachments || [],
//         ticket._id
//       );

//       ticket.messages.push({
//         senderType: "customer",
//         externalEmail: from,
//         message: cleanBody,
//         graphMessageId,
//         internetMessageId,
//         messageId: internetMessageId,
//         attachments: uploaded,
//         createdAt: new Date(),
//       });

//       ticket.lastCustomerReplyAt = new Date();
//       ticket.lastReplyAt = new Date();

//       // 🔥 reopen closed ticket
//       if (ticket.status === "closed") {
//         ticket.status = "open";
//         ticket.autoClosed = false;

//         if (!ticket.agentId) {
//           const customer = await Customer.findById(ticket.customerId);
//           if (customer) {
//             ticket.agentId = await getNextAvailableAgent(customer);
//           }
//         }
//       }

//       await ticket.save();
//       return Response.json({ success: true });
//     }

//     /* ================= NEW TICKET ================= */

//     const company = await Company.findOne({
//       "supportEmails.email": to,
//     });

//     if (!company) throw new Error("Mailbox not registered");

//     const customer = await Customer.findOne({ emailId: from });
//     if (!customer) throw new Error("Customer not registered");

//     const sentiment = await analyzeSentimentAI(cleanBody);
//     const agentId = await getNextAvailableAgent(customer);

//     ticket = await Ticket.create({
//       companyId: company._id,
//       customerId: customer._id,
//       customerEmail: from,
//       subject,
//       agentId: agentId || null,
//       sentiment,
//       emailAlias: to,
//       emailThreadId: conversationId,
//       source: "email",
//       status: "open",
//       messages: [],
//     });

//     const uploaded = await uploadAttachments(
//       raw.attachments || [],
//       ticket._id
//     );

//     ticket.messages.push({
//       senderType: "customer",
//       externalEmail: from,
//       message: cleanBody,
//       graphMessageId,
//       internetMessageId,
//       messageId: internetMessageId,
//       sentiment,
//       attachments: uploaded,
//       createdAt: new Date(),
//     });

//     ticket.lastCustomerReplyAt = new Date();
//     ticket.lastReplyAt = new Date();

//     await ticket.save();

//     return Response.json({ success: true });
//   } catch (e) {
//     console.error("INBOUND:", e);
//     return Response.json({ error: e.message }, { status: 500 });
//   }
// }





