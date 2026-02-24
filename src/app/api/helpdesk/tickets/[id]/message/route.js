
export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Company from "@/models/Company";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";



const SIGNATURE_IMAGES = [
  "https://res.cloudinary.com/dz1gfppll/image/upload/v1771918261/helpdesk/tickets/699d53b583896a82939423f3/ofbyl7veaxn9j8rcy96u.png",
  "https://res.cloudinary.com/dz1gfppll/image/upload/v1771918262/helpdesk/tickets/699d53b583896a82939423f3/pwe7hwzvy6pn7z4fgsqm.png",
  "https://res.cloudinary.com/dz1gfppll/image/upload/v1771918263/helpdesk/tickets/699d53b583896a82939423f3/krg9uscfhbxygpulxjiw.png",
  "https://res.cloudinary.com/dz1gfppll/image/upload/v1771561379/helpdesk/tickets/6997e19f29c134d3ebd4dd3f/wfe91cegymhifcgvbr0w.png",
  "https://res.cloudinary.com/dz1gfppll/image/upload/v1771561381/helpdesk/tickets/6997e19f29c134d3ebd4dd3f/gs5x2cjqykfqxohfqmj2.png"
];

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


/* ================= AGENT SIGNATURE ================= */

// function buildAgentSignature(user) {
//   const agentName = user?.name || user?.fullName || "Support Team";

//   return `
//     <br><br>
//     <p style="margin:0;color:#555;">
//       Regards,<br>
//       <b>${agentName}</b><br>
//       ${user?.role || "Support Agent"}
//     </p>
//   `;
// }



function buildAgentSignature(user) {

  const agentName = user?.name || user?.fullName || "Support Team";

  const imagesHtml = SIGNATURE_IMAGES.map(
    (url) => `
      <img 
        src="${url}" 
        width="420"
        style="display:block;margin-top:6px;border-radius:6px;"
      />
    `
  ).join("");

  return `
    <br><br>

    <div style="font-family:Arial;font-size:14px;color:#444;">
      <p style="margin:0;">
        Regards,<br>
        <b>${agentName}</b><br>
        ${user?.role || "Support Agent"}
      </p>

      <div style="margin-top:10px;">
        ${imagesHtml}
      </div>
    </div>
  `;
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
        content: `
  <p>${text.replace(/\n/g, "<br>")}</p>
  ${buildAgentSignature(user)}
`,
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


