export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Company from "@/models/Company";

/* ================= GRAPH TOKEN ================= */

async function getGraphToken(supportEmail) {
  const params = new URLSearchParams({
    client_id: supportEmail.clientId,
    client_secret: supportEmail.appPassword,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${supportEmail.tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }
  );

  const data = await res.json();
  if (!data.access_token) {
    throw new Error("Microsoft token failed");
  }

  return data.access_token;
}

/* ================= FETCH EMAIL ================= */

async function fetchOutlookMessage({ messageId, userEmail, supportEmail }) {
  const token = await getGraphToken(supportEmail);

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${userEmail}/messages/${messageId}?$expand=attachments`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) throw new Error("Fetch email failed");

  return { token, message: await res.json() };
}

/* ================= MARK READ ================= */

async function markRead(token, userEmail, messageId) {
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

/* ================= MAP PAYLOAD ================= */

function mapGraphPayload(msg, userEmail) {
  return {
    from: msg.from?.emailAddress?.address || "",
    fromEmail: msg.from?.emailAddress?.address || "",
    to: userEmail,
    subject: msg.subject || "No Subject",

    text: msg.body?.contentType === "text" ? msg.body.content : "",
    html: msg.body?.contentType === "html" ? msg.body.content : "",

    messageId: msg.internetMessageId,
    inReplyTo: msg.inReplyTo || "",
    references:
      msg.internetMessageHeaders?.find(h => h.name === "References")?.value || "",

    attachments: (msg.attachments || [])
      .filter(a => a["@odata.type"] === "#microsoft.graph.fileAttachment")
      .map(a => ({
        filename: a.name,
        contentType: a.contentType,
        size: a.size,
        content: a.contentBytes, // base64
        isInline: !!a.isInline,
        contentId: a.contentId || "",
      })),
  };
}

/* ================= PROCESS EVENTS ================= */

export async function POST(req) {
  try {
    const events = await req.json();
    if (!Array.isArray(events)) {
      return new Response("OK", { status: 200 });
    }

    await dbConnect();

    for (const event of events) {
      /* 🔐 clientState security */
      if (event.clientState !== process.env.OUTLOOK_WEBHOOK_SECRET) {
        continue;
      }

      const messageId = event.resourceData?.id;
      if (!messageId) continue;

      const match = event.resource?.match(/users\/([^/]+)/);
      const userEmail = match
        ? decodeURIComponent(match[1]).toLowerCase()
        : null;
      if (!userEmail) continue;

      const company = await Company.findOne({
        "supportEmails.email": userEmail,
        "supportEmails.type": "outlook",
        "supportEmails.inboundEnabled": true,
      }).select("supportEmails");

      if (!company) continue;

      const supportEmail = company.supportEmails.find(
        e => e.email === userEmail && e.type === "outlook"
      );
      if (!supportEmail) continue;

      const { token, message } = await fetchOutlookMessage({
        messageId,
        userEmail,
        supportEmail,
      });

      if (!message.internetMessageId) continue;

      const inboundPayload = mapGraphPayload(message, userEmail);

      await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/helpdesk/email-inbound?secret=${process.env.INBOUND_EMAIL_SECRET}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(inboundPayload),
        }
      );

      await markRead(token, userEmail, messageId);
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("❌ Outlook process error:", err);
    return new Response("OK", { status: 200 });
  }
}
