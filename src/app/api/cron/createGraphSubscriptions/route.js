// src/app/api/cron/createGraphSubscriptions/route.js
export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Company from "@/models/Company";

async function getGraphToken({ tenantId, clientId, appPassword }) {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: appPassword,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }
  );

  const data = await res.json();
  if (!data.access_token) throw new Error("Microsoft Graph token failed");
  return data.access_token;
}

async function createSubscription({ token, userEmail, webhookSecret }) {
  const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/helpdesk/outlook-webhook`;

  const res = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      changeType: "created",
      notificationUrl: callbackUrl,
      resource: `users/${userEmail}/mailFolders('Inbox')/messages`,
      expirationDateTime: new Date(Date.now() + 2.5 * 24 * 60 * 60 * 1000).toISOString(),
      clientState: webhookSecret,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(JSON.stringify(data));
  }
}

/* ================= GET ================= */
export async function GET(req) {
  // 🚫 HARD BLOCK DURING BUILD
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return Response.json({ skipped: true }, { status: 200 });
  }

  try {
    await dbConnect();

    const companies = await Company.find({
      "supportEmails.type": "outlook",
      "supportEmails.inboundEnabled": true,
    }).select("supportEmails");

    for (const company of companies) {
      for (const se of company.supportEmails) {
        if (se.type !== "outlook") continue;

        const token = await getGraphToken(se);
        await createSubscription({
          token,
          userEmail: se.email,
          webhookSecret: se.webhookSecret,
        });
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Graph Cron Error:", err);
    return Response.json({ success: false, msg: err.message }, { status: 500 });
  }
}
