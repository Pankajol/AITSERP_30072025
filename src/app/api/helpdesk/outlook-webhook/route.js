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

/* ================= MAP PAYLOAD ================= */
function mapGraphPayload(msg, userEmail) {
  const bodyType = (msg.body?.contentType || "").toLowerCase();

  return {
    from: msg.from?.emailAddress?.address || "",
    to: userEmail,
    subject: msg.subject || "No Subject",

    html: msg.body?.content || "",

    messageId: msg.internetMessageId,
    conversationId: msg.conversationId,
    inReplyTo: msg.inReplyTo || "",
    references:
      msg.internetMessageHeaders?.find(h => h.name === "References")?.value || "",

    attachments: (msg.attachments || [])
      .filter(a => a["@odata.type"] === "#microsoft.graph.fileAttachment")
      .map(a => ({
        filename: a.name,
        contentType: a.contentType,
        size: a.size,
        content: a.contentBytes,
      })),
  };
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

      const match = ev.resource.match(/users\/([^/]+)/);
      if (!match) continue;

      const userEmail = decodeURIComponent(match[1]).toLowerCase();

      const company = await Company.findOne({
        "supportEmails.email": userEmail,
        "supportEmails.type": "outlook",
        "supportEmails.inboundEnabled": true,
      }).select("+supportEmails.appPassword");

      if (!company) continue;

      const se = company.supportEmails.find(
        e => e.email === userEmail && e.type === "outlook"
      );
      if (!se) continue;

      const { token, message } = await fetchMessage({
        userEmail,
        messageId,
        supportEmail: se,
      });

      const inboundPayload = mapGraphPayload(message, userEmail);

      await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/helpdesk/email-inbound?secret=${process.env.INBOUND_EMAIL_SECRET}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(inboundPayload),
        }
      );

      await fetch(
        `https://graph.microsoft.com/v1.0/users/${userEmail}/messages/${messageId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ isRead: true }),
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
// async function getGraphToken(supportEmail) {
//   const params = new URLSearchParams({
//     client_id: supportEmail.clientId,
//     client_secret: supportEmail.appPassword,
//     grant_type: "client_credentials",
//     scope: "https://graph.microsoft.com/.default",
//   });

//   const res = await fetch(
//     `https://login.microsoftonline.com/${supportEmail.tenantId}/oauth2/v2.0/token`,
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
//     `https://graph.microsoft.com/v1.0/users/${userEmail}/messages/${messageId}`,
//     {
//       headers: { Authorization: `Bearer ${token}` },
//     }
//   );

//   if (!res.ok) throw new Error("Message fetch failed");

//   return { token, message: await res.json() };
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

// /* ================= GET ================= */
// export async function GET(req) {
//   const v = validation(req);
//   if (v) return v;
//   return new Response("OK");
// }

// /* ================= POST ================= */
// export async function POST(req) {
//   const v = validation(req);
//   if (v) return v;

//   try {
//     const payload = await req.json();
//     console.log("🔥 GRAPH EVENT:", JSON.stringify(payload));

//     const events = payload.value || [];
//     if (!events.length) return new Response("OK");

//     await dbConnect();

//     for (const ev of events) {
//       if (ev.clientState !== process.env.OUTLOOK_WEBHOOK_SECRET) continue;

//       const messageId = ev.resourceData?.id;
//       if (!messageId) continue;

//       const match = ev.resource.match(/users\/([^/]+)/);
//       if (!match) continue;

//       const userEmail = decodeURIComponent(match[1]).toLowerCase();

//       const company = await Company.findOne({
//         "supportEmails.email": userEmail,
//         "supportEmails.type": "outlook",
//       }).select("+supportEmails.appPassword");

//       if (!company) continue;

//       const supportEmail = company.supportEmails.find(
//         (e) => e.email === userEmail && e.type === "outlook"
//       );

//       if (!supportEmail) continue;

//       const { message } = await fetchMessage({
//         userEmail,
//         messageId,
//         supportEmail,
//       });

//       const inbound = {
//         from: message.from?.emailAddress?.address,
//         to: userEmail,
//         subject: message.subject || "No subject",
//         html: message.body?.content,
//         messageId: message.internetMessageId,
//         inReplyTo: message.inReplyTo,
//       };

//       // 🔥 send to your existing inbound API
//       await fetch(
//         `${process.env.NEXT_PUBLIC_BASE_URL}/api/helpdesk/email-inbound?secret=${process.env.INBOUND_EMAIL_SECRET}`,
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(inbound),
//         }
//       );
//     }

//     return new Response("OK");
//   } catch (err) {
//     console.error("❌ Outlook webhook error:", err);
//     return new Response("OK");
//   }
// }
