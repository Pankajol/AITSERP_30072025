export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import dbConnect from "@/lib/db";
import Company from "@/models/Company";

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

/* ================= FETCH MESSAGE ================= */
async function fetchMessage({ userEmail, messageId, supportEmail }) {
  const token = await getGraphToken(supportEmail);

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${userEmail}/messages/${messageId}?$expand=attachments`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) throw new Error("Message fetch failed");

  return { token, message: await res.json() };
}

/* ================= VALIDATION ================= */
function validation(req) {
  const token = new URL(req.url).searchParams.get("validationToken");
  if (token) {
    return new Response(token, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return null;
}

export async function GET(req) {
  const v = validation(req);
  if (v) return v;
  return new Response("OK");
}

/* ================= POST ================= */
export async function POST(req) {
  const v = validation(req);
  if (v) return v;

  try {
    const payload = await req.json();
    const events = payload.value || [];
    if (!events.length) return new Response("OK");

    await dbConnect();

    for (const ev of events) {
      if (ev.clientState !== process.env.OUTLOOK_WEBHOOK_SECRET) continue;

      const messageId = ev.resourceData?.id;
      if (!messageId) continue;

      const match = ev.resource.match(/users\/([^/]+)/i);
      if (!match) continue;

      const userObjectId = decodeURIComponent(match[1]);

      const company = await Company.findOne({
        "supportEmails.type": "outlook",
        "supportEmails.inboundEnabled": true,
      }).select("+supportEmails.appPassword");

      if (!company) continue;

      const se = company.supportEmails.find(e => e.type === "outlook");
      if (!se) continue;

      const token = await getGraphToken(se);

      const userRes = await fetch(
        `https://graph.microsoft.com/v1.0/users/${userObjectId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const userData = await userRes.json();
      const userEmail =
        (userData.mail || userData.userPrincipalName || "").toLowerCase();

      if (!userEmail) continue;

      const { message } = await fetchMessage({
        userEmail,
        messageId,
        supportEmail: se,
      });

      const inboundPayload = {
        from: message.from?.emailAddress?.address || "",
        to: userEmail,
        subject: message.subject || "No Subject",
        html: message.body?.content || "",
        conversationId: message.conversationId,
        messageId: message.internetMessageId,
        attachments: (message.attachments || [])
          .filter(a => a["@odata.type"] === "#microsoft.graph.fileAttachment")
          .map(a => ({
            filename: a.name,
            contentType: a.contentType,
            size: a.size,
            content: a.contentBytes,
          })),
      };

      console.log("🧵 SENDING conversationId:", inboundPayload.conversationId);

      await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/helpdesk/email-inbound?secret=${process.env.INBOUND_EMAIL_SECRET}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(inboundPayload),
        }
      );
    }

    return new Response("OK");
  } catch (err) {
    console.error("❌ Outlook webhook error:", err);
    return new Response("OK");
  }
}







// export const runtime = "nodejs";
// export const dynamic = "force-dynamic";

// import dbConnect from "@/lib/db";
// import Company from "@/models/Company";

// /* ================= GRAPH TOKEN ================= */
// async function getGraphToken(se) {
//   const params = new URLSearchParams({
//     client_id: se.clientId,
//     client_secret: se.appPassword,
//     grant_type: "client_credentials",
//     scope: "https://graph.microsoft.com/.default",
//   });

//   const res = await fetch(
//     `https://login.microsoftonline.com/${se.tenantId}/oauth2/v2.0/token`,
//     {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: params.toString(),
//     }
//   );

//   const data = await res.json();
//   if (!data.access_token) throw new Error("Graph token failed");
//   return data.access_token;
// }

// /* ================= FETCH MESSAGE ================= */
// async function fetchMessage({ userEmail, messageId, supportEmail }) {
//   const token = await getGraphToken(supportEmail);

//   const res = await fetch(
//     `https://graph.microsoft.com/v1.0/users/${userEmail}/messages/${messageId}?$expand=attachments`,
//     {
//       headers: { Authorization: `Bearer ${token}` },
//     }
//   );

//   if (!res.ok) throw new Error("Message fetch failed");

//   return { token, message: await res.json() };
// }

// /* ================= RESOLVE USER EMAIL ================= */
// async function resolveUserEmail(objectId, supportEmail) {
//   const token = await getGraphToken(supportEmail);

//   const res = await fetch(
//     `https://graph.microsoft.com/v1.0/users/${objectId}?$select=mail,userPrincipalName`,
//     {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         ConsistencyLevel: "eventual",
//       },
//     }
//   );

//   if (!res.ok) {
//     console.log("❌ Resolve user failed:", await res.text());
//     return null;
//   }

//   const data = await res.json();
//   const email = (data.mail || data.userPrincipalName || "").toLowerCase();

//   console.log("✅ Resolved user email:", email);

//   return email || null;
// }

// /* ================= VALIDATION ================= */
// function validation(req) {
//   const token = new URL(req.url).searchParams.get("validationToken");
//   if (token) {
//     return new Response(token, {
//       status: 200,
//       headers: { "Content-Type": "text/plain" },
//     });
//   }
//   return null;
// }

// export async function GET(req) {
//   const v = validation(req);
//   if (v) return v;
//   return new Response("OK");
// }

// /* ================= MAP PAYLOAD ================= */
// function mapGraphPayload(msg, userEmail) {
//   return {
//     from: msg.from?.emailAddress?.address || "",
//     to: msg.toRecipients?.[0]?.emailAddress?.address || userEmail,

//     subject: msg.subject || "No Subject",
//     html: msg.body?.content || "",

//     // ✅ ONLY conversationId for threading
//     conversationId: msg.conversationId,

//     // message id just for logging
//     messageId: msg.internetMessageId,

//     attachments: (msg.attachments || [])
//       .filter(a => a["@odata.type"] === "#microsoft.graph.fileAttachment")
//       .map(a => ({
//         filename: a.name,
//         contentType: a.contentType,
//         size: a.size,
//         content: a.contentBytes,
//       })),
//   };
// }


// /* ================= POST ================= */
// export async function POST(req) {
//   const v = validation(req);
//   if (v) return v;

//   try {
//     const payload = await req.json();
//     console.log("🔥 WEBHOOK PAYLOAD:", JSON.stringify(payload));

//     const events = payload.value || [];
//     if (!events.length) return new Response("OK");

//     await dbConnect();

//     for (const ev of events) {
//       console.log("STATE:", ev.clientState, "ENV:", process.env.OUTLOOK_WEBHOOK_SECRET);

//       if (ev.clientState !== process.env.OUTLOOK_WEBHOOK_SECRET) continue;

//       const messageId = ev.resourceData?.id;
//       if (!messageId) continue;

//       // 🔥 Case-insensitive match (Users vs users)
//       const match = ev.resource.match(/users\/([^/]+)/i);
//       if (!match) continue;

//       const userObjectId = decodeURIComponent(match[1]);

//       const company = await Company.findOne({
//         "supportEmails.type": "outlook",
//         "supportEmails.inboundEnabled": true,
//       }).select("+supportEmails.appPassword");

//       if (!company) continue;

//       const se = company.supportEmails.find(e => e.type === "outlook");
//       if (!se) continue;

//       // 🔥 Resolve real mailbox email
//       const userEmail = await resolveUserEmail(userObjectId, se);
//       if (!userEmail) continue;

//       const { token, message } = await fetchMessage({
//         userEmail,
//         messageId,
//         supportEmail: se,
//       });

// const inboundPayload = {
//   from: message.from?.emailAddress?.address || "",
//   to: userEmail,
//   subject: message.subject || "No Subject",
//   html: message.body?.content || "",
//   conversationId: message.conversationId, // 🔥 ONLY THREAD ID
//   messageId: message.internetMessageId,
//   attachments: (message.attachments || [])
//     .filter(a => a["@odata.type"] === "#microsoft.graph.fileAttachment")
//     .map(a => ({
//       filename: a.name,
//       contentType: a.contentType,
//       size: a.size,
//       content: a.contentBytes,
//     })),
// };

// console.log("🧵 SENDING conversationId:", inboundPayload.conversationId);



//       console.log("➡️ Calling inbound...");

//       await fetch(
//         `${process.env.NEXT_PUBLIC_BASE_URL}/api/helpdesk/email-inbound?secret=${process.env.INBOUND_EMAIL_SECRET}`,
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(inboundPayload),
//         }
//       );

//       console.log("⬅️ Inbound called");

//       await fetch(
//         `https://graph.microsoft.com/v1.0/users/${userEmail}/messages/${messageId}`,
//         {
//           method: "PATCH",
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({ isRead: true }),
//         }
//       );
//     }

//     return new Response("OK");
//   } catch (err) {
//     console.error("❌ Outlook webhook error:", err);
//     return new Response("OK");
//   }
// }


