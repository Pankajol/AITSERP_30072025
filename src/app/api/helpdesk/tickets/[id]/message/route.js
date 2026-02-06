
export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Company from "@/models/Company";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";

/* ================= GRAPH TOKEN ================= */
async function getGraphToken(se) {
  const params = new URLSearchParams({
    client_id: se.clientId,
    client_secret: se.appPassword,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });

  const r = await fetch(
    `https://login.microsoftonline.com/${se.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }
  );

  const data = await r.json();
  if (!data.access_token) throw new Error("Graph token failed");

  return data.access_token;
}

/* ================= CLEAN BODY ================= */
function cleanHtml(v) {
  return String(v || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .split(/From:\s|Sent:\s|To:\s|Subject:\s/i)[0]
    .trim();
}

/* ================= MAIN ================= */
export async function POST(req, { params }) {
  try {
    await dbConnect();

    /* AUTH */
    const token = getTokenFromHeader(req);
    const user = verifyJWT(token);
    if (!user) {
      return Response.json({ success: false }, { status: 401 });
    }

    const ticketId = params.id;

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) throw new Error("Ticket not found");

    const company = await Company.findById(ticket.companyId).select(
      "+supportEmails.appPassword"
    );

    if (!company?.supportEmails?.length)
      throw new Error("No support mailboxes");

    /* MATCH SUPPORT MAILBOX */
    const alias = (ticket.emailAlias || "").trim().toLowerCase();

    const support = company.supportEmails.find(
      (e) => e.email?.trim().toLowerCase() === alias
    );

    if (!support) {
      console.log("Ticket alias:", alias);
      console.log(
        "Company mailboxes:",
        company.supportEmails.map((e) => e.email)
      );
      throw new Error("Support mailbox missing");
    }

    /* LAST CUSTOMER MESSAGE (GRAPH ID) */
    const lastCustomer = [...ticket.messages]
      .reverse()
      .find((m) => m.senderType === "customer" && m.graphMessageId);

    if (!lastCustomer?.graphMessageId) {
      throw new Error("graphMessageId missing");
    }

    /* FORM DATA */
    const form = await req.formData();
    const rawText = form.get("message");
    const files = form.getAll("attachments") || [];

    const text = cleanHtml(rawText);

    /* ================= UPLOAD ATTACHMENTS ================= */
    const uploaded = [];

    for (const file of files) {
      if (!file?.arrayBuffer) continue;

      const buf = Buffer.from(await file.arrayBuffer());

      const res = await cloudinary.uploader.upload(
        `data:${file.type};base64,${buf.toString("base64")}`,
        {
          folder: `helpdesk/tickets/${ticketId}`,
          resource_type: "auto",
        }
      );

      uploaded.push({
        filename: file.name,
        url: res.secure_url,
        contentType: file.type,
        size: buf.length,
        emailBuffer: buf, // 🔥 needed for Graph
      });
    }

    /* ================= OUTLOOK FLOW ================= */

    const graphToken = await getGraphToken(support);

    /* 1️⃣ CREATE REPLY DRAFT */
    const draftRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${support.email}/messages/${lastCustomer.graphMessageId}/createReply`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${graphToken}`,
        },
      }
    );

    const draft = await draftRes.json();
    if (!draft?.id) throw new Error("Reply draft failed");

    const draftId = draft.id;

    /* 2️⃣ UPDATE BODY */
    await fetch(
      `https://graph.microsoft.com/v1.0/users/${support.email}/messages/${draftId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${graphToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: {
            contentType: "HTML",
            content: `<p>${text.replace(/\n/g, "<br>")}</p>`,
          },
        }),
      }
    );

    /* 3️⃣ ADD ATTACHMENTS */
    for (const a of uploaded) {
      await fetch(
        `https://graph.microsoft.com/v1.0/users/${support.email}/messages/${draftId}/attachments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${graphToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: a.filename,
            contentType: a.contentType,
            contentBytes: a.emailBuffer.toString("base64"),
          }),
        }
      );
    }

    /* 4️⃣ SEND */
    await fetch(
      `https://graph.microsoft.com/v1.0/users/${support.email}/messages/${draftId}/send`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${graphToken}` },
      }
    );

    /* ================= SAVE AGENT MESSAGE ================= */

    ticket.messages.push({
      senderType: "agent",
      sender: user.id,
      message: text,
      attachments: uploaded.map(({ emailBuffer, ...rest }) => rest),
      createdAt: new Date(),
    });

    ticket.lastAgentReplyAt = new Date();
    ticket.status = "in-progress";
    await ticket.save();

    return Response.json({ success: true });
  } catch (err) {
    console.error("Reply route error:", err);
    return Response.json(
      { success: false, msg: err.message },
      { status: 500 }
    );
  }
}





//  attechements included but not used properly


// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import Company from "@/models/Company";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import cloudinary from "@/lib/cloudinary";

// /* ================= GRAPH TOKEN ================= */
// async function getGraphToken(se) {
//   const params = new URLSearchParams({
//     client_id: se.clientId,
//     client_secret: se.appPassword,
//     grant_type: "client_credentials",
//     scope: "https://graph.microsoft.com/.default",
//   });

//   const r = await fetch(
//     `https://login.microsoftonline.com/${se.tenantId}/oauth2/v2.0/token`,
//     {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: params.toString(),
//     }
//   );

//   const data = await r.json();
//   if (!data.access_token) throw new Error("Graph token failed");

//   return data.access_token;
// }

// /* ================= CLEAN HTML ================= */
// function cleanHtml(v) {
//   return String(v || "")
//     .replace(/<style[\s\S]*?<\/style>/gi, "")
//     .replace(/<script[\s\S]*?<\/script>/gi, "")
//     .replace(/<\/?[^>]+>/g, "")
//     .replace(/&nbsp;/g, " ")
//     .split(/From:\s|Sent:\s|To:\s|Subject:\s/i)[0]
//     .trim();
// }

// /* ================= MAIN ================= */
// export async function POST(req, { params }) {
//   try {
//     await dbConnect();

//     /* AUTH */
//     const token = getTokenFromHeader(req);
//     const user = verifyJWT(token);
//     if (!user) {
//       return Response.json({ success: false }, { status: 401 });
//     }

//     const { id } = params;

//     const ticket = await Ticket.findById(id);
//     if (!ticket) throw new Error("Ticket not found");

//     const company = await Company.findById(ticket.companyId).select(
//       "+supportEmails.appPassword"
//     );

//     if (!company?.supportEmails?.length)
//       throw new Error("No support mailboxes");

//     /* SUPPORT MAILBOX MATCH */
//     const alias = (ticket.emailAlias || "").trim().toLowerCase();

//     const support = company.supportEmails.find(
//       (e) => e.email?.trim().toLowerCase() === alias
//     );

//     if (!support) {
//       console.log("Ticket alias:", alias);
//       console.log("Company mailboxes:", company.supportEmails.map(e => e.email));
//       throw new Error("Support mailbox missing");
//     }

//     /* FIND LAST CUSTOMER GRAPH MESSAGE */
//     const lastCustomer = [...ticket.messages]
//       .reverse()
//       .find((m) => m.senderType === "customer" && m.graphMessageId);

//     if (!lastCustomer) throw new Error("graphMessageId missing");

//     /* FORM DATA */
//     const form = await req.formData();
//     const rawText = form.get("message");
//     const files = form.getAll("attachments") || [];

//     const text = cleanHtml(rawText);

//     /* ================= ATTACHMENTS ================= */
//     const uploaded = [];

//     for (const file of files) {
//       if (!file?.arrayBuffer) continue;

//       const buf = Buffer.from(await file.arrayBuffer());

//       const res = await cloudinary.uploader.upload(
//         `data:${file.type};base64,${buf.toString("base64")}`,
//         {
//           folder: `helpdesk/tickets/${id}`,
//           resource_type: "auto",
//         }
//       );

//       uploaded.push({
//         filename: file.name,
//         url: res.secure_url,
//         contentType: file.type,
//         size: buf.length,
//       });
//     }

//     /* ================= OUTLOOK REPLY ================= */
//     const graphToken = await getGraphToken(support);
   
//     const graphRes = await fetch(
//       `https://graph.microsoft.com/v1.0/users/${support.email}/messages/${lastCustomer.graphMessageId}/reply`,
//       {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${graphToken}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           message: {
//             body: {
//               contentType: "HTML",
//               content: `<p>${text.replace(/\n/g, "<br>")}</p>`,
//             },
//           },
//         }),
//       }
//     );

//     if (!graphRes.ok) {
//       throw new Error("Outlook reply failed: " + (await graphRes.text()));
//     }

//     /* ================= SAVE AGENT MESSAGE ================= */
//     ticket.messages.push({
//       senderType: "agent",
//       sender: user.id,
//       message: text,
//       attachments: uploaded,
//       createdAt: new Date(),
//     });

//     ticket.lastAgentReplyAt = new Date();
//     ticket.status = "in-progress";
//     await ticket.save();

//     return Response.json({ success: true });
//   } catch (err) {
//     console.error("Reply route error:", err);
//     return Response.json(
//       { success: false, msg: err.message },
//       { status: 500 }
//     );
//   }
// }

//  without attechements



// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import Company from "@/models/Company";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";


// /* GRAPH TOKEN */
// async function getGraphToken(se) {
//   const params = new URLSearchParams({
//     client_id: se.clientId,
//     client_secret: se.appPassword,
//     grant_type: "client_credentials",
//     scope: "https://graph.microsoft.com/.default",
//   });

//   const r = await fetch(
//     `https://login.microsoftonline.com/${se.tenantId}/oauth2/v2.0/token`,
//     { method: "POST", body: params }
//   );

//   return (await r.json()).access_token;
// }

// export async function POST(req, { params }) {
//   await dbConnect();

//   const token = getTokenFromHeader(req);
//   const user = verifyJWT(token);

//   const { id } = params;
//   const ticket = await Ticket.findById(id);
//   const company = await Company.findById(ticket.companyId).select(
//     "+supportEmails.appPassword"
//   );

//  const alias = (ticket.emailAlias || "").trim().toLowerCase();

// const support = company.supportEmails.find(
//   (e) => e.email?.trim().toLowerCase() === alias
// );

// if (!support) {
//   console.log("❌ Support mailbox not matched");
//   console.log("Ticket alias:", alias);
//   console.log(
//     "Company mailboxes:",
//     company.supportEmails.map((e) => e.email)
//   );

//   throw new Error("Support mailbox missing");
// }

//   const lastCustomer = [...ticket.messages]
//     .reverse()
//     .find((m) => m.senderType === "customer" && m.graphMessageId);

//   if (!lastCustomer) throw new Error("graphMessageId missing");

//   const graphToken = await getGraphToken(support);

//   const body = await req.formData();
//   const text = body.get("message");

//   await fetch(
//     `https://graph.microsoft.com/v1.0/users/${support.email}/messages/${lastCustomer.graphMessageId}/reply`,
//     {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${graphToken}`,
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         message: {
//           body: { contentType: "HTML", content: text },
//         },
//       }),
//     }
//   );

//   ticket.messages.push({
//     senderType: "agent",
//     sender: user.id,
//     message: text,
//   });

//   ticket.lastAgentReplyAt = new Date();
//   ticket.status = "in-progress";
//   await ticket.save();

//   return Response.json({ success: true });
// }


