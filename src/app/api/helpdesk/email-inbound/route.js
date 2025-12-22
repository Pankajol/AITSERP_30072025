export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Customer from "@/models/CustomerModel";
import Company from "@/models/Company";
import Notification from "@/models/helpdesk/Notification";
import { getNextAvailableAgent } from "@/utils/getNextAvailableAgent";
import { analyzeSentimentAI } from "@/utils/aiSentiment";

/* ===================== HELPERS ===================== */

function normalizeId(id) {
  if (!id) return "";
  try {
    let s = String(id).trim();
    if (s.startsWith("<") && s.endsWith(">")) s = s.slice(1, -1);
    return s.replace(/[\r\n\s]+/g, "");
  } catch {
    return "";
  }
}

function extractEmail(value) {
  if (!value) return "";
  if (Array.isArray(value)) value = value[0];
  if (typeof value === "object" && value !== null) {
    return (value.email || value.address || value.mail || "")
      .toString()
      .toLowerCase();
  }
  const m = String(value).match(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
  );
  return m ? m[1].toLowerCase() : "";
}

async function parseBody(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  try {
    if (ct.includes("application/json")) return await req.json();
    if (ct.includes("application/x-www-form-urlencoded")) {
      const txt = await req.text();
      return Object.fromEntries(new URLSearchParams(txt));
    }
    const txt = await req.text();
    try { return JSON.parse(txt); } catch { return { body: txt }; }
  } catch {
    return {};
  }
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ===================== MAIN ===================== */

export async function POST(req) {
  try {
    console.log("📩 INBOUND EMAIL RECEIVED");

    /* ---------- AUTH ---------- */
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    const SECRET = process.env.INBOUND_EMAIL_SECRET;

    if (!SECRET || secret !== SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const raw = await parseBody(req);

    /* ---------- PARSE EMAIL ---------- */
    const fromEmail = extractEmail(raw.from || raw.sender || raw["From"]);
    const toRaw = extractEmail(raw.to || raw.recipient) || "";
    const subject = raw.subject || "No Subject";
    const text = raw.text || raw.body || "";
    const html = raw.html || "";

    if (!fromEmail) {
      return Response.json({ error: "Missing sender" }, { status: 400 });
    }

    const messageId = normalizeId(raw.messageId || raw["Message-ID"] || raw["Message-Id"]);
    const inReplyTo = normalizeId(raw.inReplyTo);
    const references = (raw.references || "")
      .toString()
      .split(/\s+/)
      .map(normalizeId)
      .filter(Boolean);

    /* ================= COMPANY MAILBOX CHECK ================= */
    let company = null;

    if (toRaw) {
      company = await Company.findOne({
        supportEmails: { $in: [toRaw] }
      }).select("_id name supportEmails");
    }

    const FALLBACK_SUPPORT_EMAIL = (process.env.SUPPORT_EMAIL || "").toLowerCase();
    const isReply = Boolean(inReplyTo || references.length);

    console.log("📨 Incoming TO:", toRaw);
    console.log("🏢 Company match:", company ? company.name : "None");
    console.log("🛟 Fallback mailbox:", FALLBACK_SUPPORT_EMAIL || "None");
    console.log("💬 IsReply:", isReply);

    if (company) {
      console.log(`🎯 Routed to company: ${company.name}`);
    } else if (isReply) {
      console.log("💬 Reply thread — bypass mailbox rules");
    } else if (FALLBACK_SUPPORT_EMAIL && toRaw.includes(FALLBACK_SUPPORT_EMAIL)) {
      console.log(`🛟 Using fallback mailbox: ${FALLBACK_SUPPORT_EMAIL}`);
    } else {
      console.log("❌ Invalid mailbox — rejecting");
      return Response.json({ error: "Invalid mailbox" }, { status: 403 });
    }

    /* ---------- DUPLICATE PROTECTION ---------- */
    if (messageId) {
      const dup = await Ticket.findOne({ "messages.messageId": messageId }).select("_id");
      if (dup) {
        return Response.json({ success: true, duplicate: true, ticketId: dup._id }, { status: 200 });
      }
    }

    /* ---------- CUSTOMER LOOKUP ---------- */
    const customer = await Customer.findOne({
      emailId: { $regex: new RegExp("^" + escapeRegExp(fromEmail) + "$", "i") }
    });

   /* ---------- CUSTOMER LOOKUP ---------- */

if (!customer) {
  console.log("⛔ Blocked unknown customer:", fromEmail);
  return Response.json({ error: "Unknown customer" }, { status: 403 });
}

if (!customer.companyId) {
  console.log("⛔ Customer not linked to company:", fromEmail);
  return Response.json({ error: "Customer has no company assigned" }, { status: 403 });
}


    /* ---------- FIND EXISTING TICKET ---------- */
    let ticket = null;
    const searchIds = [messageId, inReplyTo, ...references].filter(Boolean);

    if (searchIds.length) {
      ticket = await Ticket.findOne({
        $or: [
          { emailThreadId: { $in: searchIds } },
          { "messages.messageId": { $in: searchIds } }
        ]
      });
    }

    /* ===================== REPLY CASE ===================== */
    if (ticket) {
      if (!ticket.companyId && company?._id) ticket.companyId = company._id;
      if (!ticket.companyId && customer?.companyId) ticket.companyId = customer.companyId;

      const sentiment = await analyzeSentimentAI(text || html);

      ticket.messages.push({
        senderType: "customer",
        externalEmail: fromEmail,
        message: text || html,
        messageId,
        sentiment,
        createdAt: new Date(),
      });

      ticket.sentiment = sentiment;
      ticket.lastCustomerReplyAt = new Date();
      ticket.updatedAt = new Date();

      if (sentiment === "negative" && ticket.agentId) {
        await Notification.create({
          userId: ticket.agentId,
          type: "NEGATIVE_SENTIMENT",
          ticketId: ticket._id,
          companyId: ticket.companyId || null,
          message: "⚠️ Negative sentiment detected in customer reply",
        });

        ticket.priority = "high";
      }

      await ticket.save();
      return Response.json({ success: true, ticketId: ticket._id }, { status: 200 });
    }

    /* ===================== NEW TICKET ===================== */
    let agentId = null;
    if (customer) agentId = await getNextAvailableAgent(customer);

    const sentiment = await analyzeSentimentAI(text || html);

    ticket = await Ticket.create({
      companyId: company?._id || customer?.companyId || null,
      customerId: customer?._id || null,
      customerEmail: fromEmail,
      subject,
      source: "email",
      status: "open",
      agentId,
      sentiment,
      priority: sentiment === "negative" ? "high" : "normal",
      emailThreadId: messageId || `local-${Date.now()}`,
      messages: [
        {
          senderType: "customer",
          externalEmail: fromEmail,
          message: text || html,
          messageId,
          sentiment,
          createdAt: new Date(),
        },
      ],
      lastCustomerReplyAt: new Date(),
    });

    if (sentiment === "negative" && agentId) {
      await Notification.create({
        userId: agentId,
        type: "NEGATIVE_SENTIMENT",
        ticketId: ticket._id,
        companyId: ticket.companyId || null,
        message: "⚠️ Negative sentiment detected in new ticket",
      });
    }

    return Response.json({ success: true, ticketId: ticket._id }, { status: 200 });
  } catch (err) {
    console.error("❌ Inbound error:", err);
    return Response.json({ error: err.message || "Server error" }, { status: 500 });
  }
}



// ===================== INBOUND EMAIL HANDLER =====================
// but sab mail create ho raha hai

// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import Customer from "@/models/CustomerModel";
// import { getNextAvailableAgent } from "@/utils/getNextAvailableAgent";
// import Notification from "@/models/helpdesk/Notification";
// import { analyzeSentimentAI } from "@/utils/aiSentiment";

// const FALLBACK_SUPPORT_EMAIL = "pankajal2099@gmail.com";

// /* ===================== HELPERS ===================== */

// function normalizeId(id) {
//   if (!id) return "";
//   try {
//     let s = String(id).trim();
//     if (s.startsWith("<") && s.endsWith(">")) s = s.slice(1, -1);
//     return s.replace(/[\r\n\s]+/g, "");
//   } catch {
//     return "";
//   }
// }

// function extractEmail(value) {
//   if (!value) return "";
//   if (Array.isArray(value)) value = value[0];
//   if (typeof value === "object" && value !== null) {
//     return (value.email || value.address || value.mail || "")
//       .toString()
//       .toLowerCase();
//   }
//   const m = String(value).match(
//     /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
//   );
//   return m ? m[1].toLowerCase() : "";
// }

// async function parseBody(req) {
//   const ct = (req.headers.get("content-type") || "").toLowerCase();
//   try {
//     if (ct.includes("application/json")) return await req.json();
//     if (ct.includes("application/x-www-form-urlencoded")) {
//       const txt = await req.text();
//       return Object.fromEntries(new URLSearchParams(txt));
//     }
//     const txt = await req.text();
//     try {
//       return JSON.parse(txt);
//     } catch {
//       return { body: txt };
//     }
//   } catch {
//     return {};
//   }
// }

// function escapeRegExp(str) {
//   return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// }

// /* ===================== MAIN ===================== */

// export async function POST(req) {
//   try {
//     console.log("📩 INBOUND EMAIL RECEIVED");

//     /* ---------- AUTH ---------- */
//     const { searchParams } = new URL(req.url);
//     const secret = searchParams.get("secret");
//     const SECRET = process.env.INBOUND_EMAIL_SECRET;

//     if (!SECRET || secret !== SECRET) {
//       return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
//     }

//     await dbConnect();
//     const raw = await parseBody(req);

//     /* ---------- PARSE EMAIL ---------- */
//     const fromEmail = extractEmail(raw.from || raw.sender || raw["From"]);
//     const toRaw = String(raw.to || raw.recipient || "").toLowerCase();
//     const subject = raw.subject || "No Subject";
//     const text = raw.text || raw.body || "";
//     const html = raw.html || "";

//     if (!fromEmail) {
//       return new Response(JSON.stringify({ error: "Missing sender" }), { status: 400 });
//     }

//     const messageId = normalizeId(
//       raw.messageId || raw["Message-ID"] || raw["Message-Id"]
//     );

//     const inReplyTo = normalizeId(raw.inReplyTo);
//     const references = (raw.references || "")
//       .toString()
//       .split(/\s+/)
//       .map(normalizeId)
//       .filter(Boolean);

//     /* ---------- MAILBOX CHECK ---------- */
//     const SUPPORT_EMAIL = (process.env.SUPPORT_EMAIL || FALLBACK_SUPPORT_EMAIL).toLowerCase();
//     const isReply = Boolean(inReplyTo || references.length);

//     if (!toRaw.includes(SUPPORT_EMAIL) && !isReply) {
//       return new Response(JSON.stringify({ error: "Invalid mailbox" }), { status: 403 });
//     }

//     /* ---------- DUPLICATE PROTECTION ---------- */
//     if (messageId) {
//       const dup = await Ticket.findOne({
//         "messages.messageId": messageId,
//       }).select("_id");

//       if (dup) {
//         return new Response(
//           JSON.stringify({ success: true, duplicate: true, ticketId: dup._id }),
//           { status: 200 }
//         );
//       }
//     }

//     /* ---------- CUSTOMER LOOKUP ---------- */
//     const customer = await Customer.findOne({
//       emailId: { $regex: new RegExp("^" + escapeRegExp(fromEmail) + "$", "i") },
//     });

//     /* ---------- FIND EXISTING TICKET ---------- */
//     let ticket = null;
//     const searchIds = [messageId, inReplyTo, ...references].filter(Boolean);

//     if (searchIds.length) {
//       ticket = await Ticket.findOne({
//         $or: [
//           { emailThreadId: { $in: searchIds } },
//           { "messages.messageId": { $in: searchIds } },
//         ],
//       });
//     }

//     /* ===================== REPLY CASE ===================== */
//     if (ticket) {
//       // 🔥 NEW: AI SENTIMENT
//       const sentiment = await analyzeSentimentAI(text || html);

//       ticket.messages.push({
//         senderType: "customer",
//         externalEmail: fromEmail,
//         message: text || html,
//         messageId,
//         sentiment, // 🔥 NEW
//         createdAt: new Date(),
//       });

//       ticket.sentiment = sentiment; // 🔥 NEW
//       ticket.lastCustomerReplyAt = new Date();
//       ticket.updatedAt = new Date();

//       // 🔥 NEGATIVE ALERT
//       if (sentiment === "negative" && ticket.agentId) {
//         await Notification.create({
//           userId: ticket.agentId,
//           type: "NEGATIVE_SENTIMENT",
//           ticketId: ticket._id,
//           message: "⚠️ Negative sentiment detected in customer reply",
//         });

//         ticket.priority = "high";
//       }

//       await ticket.save();

//       return new Response(
//         JSON.stringify({ success: true, ticketId: ticket._id }),
//         { status: 200 }
//       );
//     }

//     /* ===================== NEW TICKET ===================== */

//     let agentId = null;

//     if (customer) {
//       agentId = await getNextAvailableAgent(customer);
//     }

//     // 🔥 NEW: AI SENTIMENT FOR FIRST MESSAGE
//     const sentiment = await analyzeSentimentAI(text || html);

//     ticket = await Ticket.create({
//       customerId: customer?._id || null,
//       customerEmail: fromEmail,
//       subject,
//       source: "email",
//       status: "open",
//       agentId: agentId || null,
//       sentiment, // 🔥 NEW
//       priority: sentiment === "negative" ? "high" : "normal",

//       emailThreadId: messageId || `local-${Date.now()}`,
//       messages: [
//         {
//           senderType: "customer",
//           externalEmail: fromEmail,
//           message: text || html,
//           messageId,
//           sentiment, // 🔥 NEW
//           createdAt: new Date(),
//         },
//       ],
//       lastCustomerReplyAt: new Date(),
//     });

//     // 🔥 NEGATIVE ALERT ON CREATION
//     if (sentiment === "negative" && agentId) {
//       await Notification.create({
//         userId: agentId,
//         type: "NEGATIVE_SENTIMENT",
//         ticketId: ticket._id,
//         message: "⚠️ Negative sentiment detected in new ticket",
//       });
//     }

//     return new Response(
//       JSON.stringify({ success: true, ticketId: ticket._id }),
//       { status: 200 }
//     );
//   } catch (err) {
//     console.error("❌ Inbound error:", err);
//     return new Response(
//       JSON.stringify({ error: err.message || "Server error" }),
//       { status: 500 }
//     );
//   }
// }

// /* ===================== HEALTH ===================== */
// export async function GET() {
//   return new Response(
//     JSON.stringify({ success: true, message: "Inbound endpoint OK" }),
//     { status: 200 }
//   );
// }


// inche sahi code bhi ho sakta hai plz check below

// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import Customer from "@/models/CustomerModel";
// import { getNextAvailableAgent } from "@/utils/getNextAvailableAgent";
// import Notification from "@/models/helpdesk/Notification";
// import { analyzeSentimentAI } from "@/utils/aiSentiment";

// const FALLBACK_SUPPORT_EMAIL = "pankajal2099@gmail.com";

// /* ===================== HELPERS ===================== */

// function normalizeId(id) {
//   if (!id) return "";
//   try {
//     let s = String(id).trim();
//     if (s.startsWith("<") && s.endsWith(">")) s = s.slice(1, -1);
//     return s.replace(/[\r\n\s]+/g, "");
//   } catch {
//     return "";
//   }
// }

// function extractEmail(value) {
//   if (!value) return "";
//   if (Array.isArray(value)) value = value[0];
//   if (typeof value === "object" && value !== null) {
//     return (value.email || value.address || value.mail || "").toString().toLowerCase();
//   }
//   const m = String(value).match(
//     /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
//   );
//   return m ? m[1].toLowerCase() : "";
// }

// async function parseBody(req) {
//   const ct = (req.headers.get("content-type") || "").toLowerCase();
//   try {
//     if (ct.includes("application/json")) return await req.json();
//     if (ct.includes("application/x-www-form-urlencoded")) {
//       const txt = await req.text();
//       return Object.fromEntries(new URLSearchParams(txt));
//     }
//     const txt = await req.text();
//     try {
//       return JSON.parse(txt);
//     } catch {
//       return { body: txt };
//     }
//   } catch {
//     return {};
//   }
// }

// function escapeRegExp(str) {
//   return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// }

// /* ===================== MAIN ===================== */

// export async function POST(req) {
//   try {
//     console.log("📩 INBOUND EMAIL RECEIVED");

//     /* ---------- AUTH ---------- */
//     const { searchParams } = new URL(req.url);
//     const secret = searchParams.get("secret");
//     const SECRET = process.env.INBOUND_EMAIL_SECRET;
    

//     if (!SECRET || secret !== SECRET) {
//       return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
//     }

//     await dbConnect();
//     const raw = await parseBody(req);

//     /* ---------- PARSE EMAIL ---------- */
//     const fromEmail = extractEmail(raw.from || raw.sender || raw["From"]);
//     const toRaw = String(raw.to || raw.recipient || "").toLowerCase();
//     const subject = raw.subject || "No Subject";
//     const text = raw.text || raw.body || "";
//     const html = raw.html || "";

//     if (!fromEmail) {
//       return new Response(JSON.stringify({ error: "Missing sender" }), { status: 400 });
//     }

//     const messageId = normalizeId(
//       raw.messageId || raw["Message-ID"] || raw["Message-Id"]
//     );

//     const inReplyTo = normalizeId(raw.inReplyTo);
//     const references = (raw.references || "")
//       .toString()
//       .split(/\s+/)
//       .map(normalizeId)
//       .filter(Boolean);

//     /* ---------- MAILBOX CHECK ---------- */
//     const SUPPORT_EMAIL = (process.env.SUPPORT_EMAIL || FALLBACK_SUPPORT_EMAIL).toLowerCase();
//     const isReply = Boolean(inReplyTo || references.length);

//     if (!toRaw.includes(SUPPORT_EMAIL) && !isReply) {
//       return new Response(JSON.stringify({ error: "Invalid mailbox" }), { status: 403 });
//     }

//     /* ---------- DUPLICATE PROTECTION ---------- */
//     if (messageId) {
//       const dup = await Ticket.findOne({
//         "messages.messageId": messageId,
//       }).select("_id");

//       if (dup) {
//         return new Response(
//           JSON.stringify({ success: true, duplicate: true, ticketId: dup._id }),
//           { status: 200 }
//         );
//       }
//     }

//     /* ---------- CUSTOMER LOOKUP ---------- */
//     const customer = await Customer.findOne({
//       emailId: { $regex: new RegExp("^" + escapeRegExp(fromEmail) + "$", "i") },
//     });

//     /* ---------- FIND EXISTING TICKET ---------- */
//     let ticket = null;
//     const searchIds = [messageId, inReplyTo, ...references].filter(Boolean);

//     if (searchIds.length) {
//       ticket = await Ticket.findOne({
//         $or: [
//           { emailThreadId: { $in: searchIds } },
//           { "messages.messageId": { $in: searchIds } },
//         ],
//       });
//     }

//     /* ===================== REPLY CASE ===================== */
//     if (ticket) {
//       ticket.messages.push({
//         sender: null,
//         senderType: "customer",
//         externalEmail: fromEmail,
//         message: text || html,
//         messageId,
//         createdAt: new Date(),
//       });

//       ticket.lastReplyAt = new Date();
//       ticket.updatedAt = new Date();
//       await ticket.save();

//       return new Response(
//         JSON.stringify({ success: true, ticketId: ticket._id }),
//         { status: 200 }
//       );
//     }

//     /* ===================== NEW TICKET ===================== */

   
// let agentId = null;

// if (customer) {
//   console.log("👤 Customer found:", customer._id.toString());
//   console.log("👥 Customer assignedAgents:", customer.assignedAgents);

//   agentId = await getNextAvailableAgent(customer);

//   console.log("🎯 Selected agentId:", agentId);
// } else {
//   console.log("❌ No customer found for email:", fromEmail);
// }

// ticket = await Ticket.create({
//   customerId: customer?._id || null,
//   customerEmail: fromEmail,
//   subject,
//   source: "email",
//   status: "open",

//   // ✅ CORRECT FIELD
//   agentId: agentId || null,

//   emailThreadId: messageId || `local-${Date.now()}`,
//   messages: [
//     {
//       senderType: "customer",
//       externalEmail: fromEmail,
//       message: text || html,
//       messageId,
//       createdAt: new Date(),
//     },
//   ],
//   lastReplyAt: new Date(),
// });



//     return new Response(
//       JSON.stringify({ success: true, ticketId: ticket._id }),
//       { status: 200 }
//     );
//   } catch (err) {
//     console.error("❌ Inbound error:", err);
//     return new Response(
//       JSON.stringify({ error: err.message || "Server error" }),
//       { status: 500 }
//     );
//   }
// }

// /* ===================== HEALTH ===================== */
// export async function GET() {
//   return new Response(
//     JSON.stringify({ success: true, message: "Inbound endpoint OK" }),
//     { status: 200 }
//   );
// }


