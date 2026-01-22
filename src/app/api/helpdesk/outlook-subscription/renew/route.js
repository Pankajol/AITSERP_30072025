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
  if (!data.access_token) throw new Error("Graph token failed");
  return data.access_token;
}

export async function POST(req) {
  try {
    // 🔐 protect cron endpoint with secret
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    if (secret !== process.env.INBOUND_EMAIL_SECRET) {
      return Response.json({ success: false, msg: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const companies = await Company.find({})
      .select("supportEmails +supportEmails.appPassword");

    const now = Date.now();
    const renewBeforeMs = 12 * 60 * 60 * 1000; // 12 hrs

    let renewed = 0;
    let skipped = 0;

    for (const company of companies) {
      for (const se of company.supportEmails || []) {
        if (se.type !== "outlook") continue;
        if (!se.subscriptionId) {
          skipped++;
          continue;
        }

        const expires = se.subscriptionExpiresAt ? new Date(se.subscriptionExpiresAt).getTime() : 0;
        if (expires && expires - now > renewBeforeMs) {
          skipped++;
          continue;
        }

        // renew
        const token = await getGraphToken(se);
        const newExpireAt = new Date(Date.now() + 2.5 * 24 * 60 * 60 * 1000).toISOString();

        const res = await fetch(
          `https://graph.microsoft.com/v1.0/subscriptions/${se.subscriptionId}`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              expirationDateTime: newExpireAt,
            }),
          }
        );

        const data = await res.json();
        if (!res.ok) {
          console.log("❌ Renew failed for:", se.email, data);
          continue;
        }

        se.subscriptionExpiresAt = data.expirationDateTime;
        renewed++;
      }

      await company.save();
    }

    return Response.json({
      success: true,
      renewed,
      skipped,
      msg: "Renew process done",
    });
  } catch (err) {
    console.error("Renew Error:", err);
    return Response.json({ success: false, msg: err.message }, { status: 500 });
  }
}
