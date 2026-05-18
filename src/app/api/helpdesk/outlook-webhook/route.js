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

/* ================= FETCH MESSAGE WITH ALL ATTACHMENTS ================= */
async function fetchMessageWithAttachments({ userEmail, messageId, supportEmail, token }) {
  // First fetch message with attachment metadata
  const msgRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${userEmail}/messages/${messageId}?$expand=attachments`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!msgRes.ok) throw new Error("Message fetch failed");
  const message = await msgRes.json();

  // Process attachments
  const attachments = [];
  for (const att of message.attachments || []) {
    const odataType = att["@odata.type"];
    const name = att.name || "attachment";
    console.log(`📎 Processing attachment: ${name} (${odataType})`);

    try {
      if (odataType === "#microsoft.graph.fileAttachment") {
        let contentBytes = att.contentBytes;
        // If missing (e.g., >4MB), fetch separately
        if (!contentBytes && att.id) {
          const contentRes = await fetch(
            `https://graph.microsoft.com/v1.0/users/${userEmail}/messages/${messageId}/attachments/${att.id}/$value`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (contentRes.ok) {
            const buffer = await contentRes.arrayBuffer();
            contentBytes = Buffer.from(buffer).toString("base64");
          }
        }
        if (contentBytes) {
          attachments.push({
            filename: name,
            contentType: att.contentType || "application/octet-stream",
            size: att.size,
            content: contentBytes,
          });
        } else {
          console.warn(`⚠️ No content for file attachment: ${name}`);
        }
      }
      else if (odataType === "#microsoft.graph.itemAttachment") {
        // Fetch the item's MIME content (e.g., .eml)
        const itemRes = await fetch(
          `https://graph.microsoft.com/v1.0/users/${userEmail}/messages/${messageId}/attachments/${att.id}/$value`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (itemRes.ok) {
          const buffer = await itemRes.arrayBuffer();
          attachments.push({
            filename: name.endsWith(".eml") ? name : name + ".eml",
            contentType: "message/rfc822",
            size: buffer.byteLength,
            content: Buffer.from(buffer).toString("base64"),
          });
        }
      }
      else if (odataType === "#microsoft.graph.referenceAttachment") {
        // For OneDrive/SharePoint links – optionally download or skip
        console.log(`🔗 Reference attachment skipped: ${name} (${att.sourceUrl})`);
      }
      else {
        console.log(`❓ Unknown attachment type: ${odataType}`);
      }
    } catch (err) {
      console.error(`Failed to process attachment ${name}:`, err.message);
    }
  }

  return { message, attachments };
}

/* ================= VALIDATION ================= */
function validation(req) {
  const token = new URL(req.url).searchParams.get("validationToken");
  if (token) {
    return new Response(token, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return null;
}

export async function GET(req) {
  const v = validation(req);
  if (v) return v;
  return new Response("OK");
}

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

      // Find company with Outlook support mailbox
      const company = await Company.findOne({
        "supportEmails.type": "outlook",
        "supportEmails.inboundEnabled": true,
      }).select("+supportEmails.appPassword");
      if (!company) continue;

      const se = company.supportEmails.find((e) => e.type === "outlook");
      if (!se) continue;

      const token = await getGraphToken(se);

      // Resolve mailbox email from object ID (may be a shared mailbox)
      const userRes = await fetch(
        `https://graph.microsoft.com/v1.0/users/${userObjectId}?$select=mail,userPrincipalName`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const userData = await userRes.json();
      let userEmail = (userData.mail || userData.userPrincipalName || "").toLowerCase();
      if (!userEmail) continue;

      // For reliability, use the support mailbox email directly (app permission allows it)
      const mailboxEmail = se.email.toLowerCase();

      const { message, attachments } = await fetchMessageWithAttachments({
        userEmail: mailboxEmail,   // use the support email as the mailbox identifier
        messageId,
        supportEmail: se,
        token,
      });

      // Determine the recipient address that matches our support mailbox
      let toEmail = null;
      const allRecipients = [
        ...(message.toRecipients || []),
        ...(message.ccRecipients || []),
        ...(message.receivedRecipients || [])
      ];
      for (const rec of allRecipients) {
        const addr = rec.emailAddress?.address?.toLowerCase();
        if (addr && company.supportEmails.some(e => e.email.toLowerCase() === addr)) {
          toEmail = addr;
          break;
        }
      }
      if (!toEmail) toEmail = mailboxEmail; // fallback

      const inboundPayload = {
        from: message.from?.emailAddress?.address || "",
        to: toEmail.toLowerCase(),
        subject: message.subject || "No Subject",
        html: message.body?.content || "",
        graphMessageId: message.id,
        messageId: message.internetMessageId,
        conversationId: message.conversationId,
        attachments: attachments,
      };

      console.log(`✅ INBOUND TO: ${inboundPayload.to}, attachments: ${attachments.length}`);
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


