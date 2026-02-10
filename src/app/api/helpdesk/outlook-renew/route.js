export const runtime = "nodejs";

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


export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.get("secret") !== process.env.CRON_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // 🔁 renew logic yaha
    await renewOutlookTokens();

    return Response.json({ success: true });
  } catch (err) {
    console.error("Renew error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

/* ================= POST ================= */
export async function POST(req) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("secret") !== process.env.CRON_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const companies = await Company.find({
      "supportEmails.type": "outlook",
      "supportEmails.inboundEnabled": true,
    }).select("+supportEmails.appPassword");

    for (const company of companies) {
      const se = company.supportEmails.find(e => e.type === "outlook");
      if (!se) continue;

      const token = await getGraphToken(se);

      // 🔎 Existing subscriptions
      const subsRes = await fetch(
        "https://graph.microsoft.com/v1.0/subscriptions",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const subs = await subsRes.json();
      const sub = subs.value?.find(s =>
        s.resource?.includes(se.email)
      );

      if (!sub) {
        console.log("🆕 Creating new subscription for", se.email);

        await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            changeType: "created",
            notificationUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/helpdesk/outlook-webhook`,
            resource: `/users/${se.email}/messages`,
            expirationDateTime: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
            clientState: process.env.OUTLOOK_WEBHOOK_SECRET,
          }),
        });

        continue;
      }

      // 🔁 Renew subscription
      await fetch(
        `https://graph.microsoft.com/v1.0/subscriptions/${sub.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            expirationDateTime: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString(),
          }),
        }
      );

      console.log("🔁 Renewed subscription:", se.email);
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("❌ Renew error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
