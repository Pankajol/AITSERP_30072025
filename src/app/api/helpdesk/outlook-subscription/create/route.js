export const runtime = "nodejs";
export const dynamic = "force-dynamic";


import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

/* ================= GRAPH TOKEN ================= */
async function getGraphToken(supportEmail) {
  const params = new URLSearchParams({
    client_id: supportEmail.clientId,
    client_secret: supportEmail.appPassword, // direct
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
    await dbConnect();

    // ✅ admin auth (same company)
    const token = getTokenFromHeader(req);
    const user = verifyJWT(token);
    if (!user?.companyId)
      return Response.json({ success: false, msg: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { supportEmail } = body; // e.g. "support@aitsind.com"
    if (!supportEmail)
      return Response.json({ success: false, msg: "supportEmail required" }, { status: 400 });

    // find company support email config
  const company = await Company.findById(user.companyId).select("+supportEmails.appPassword");

    if (!company)
      return Response.json({ success: false, msg: "Company not found" }, { status: 404 });

    const se = company.supportEmails.find(
      (e) => e.email?.toLowerCase() === supportEmail.toLowerCase() && e.type === "outlook"
    );
    if (!se)
      return Response.json({ success: false, msg: "Outlook support email not found" }, { status: 404 });

    // token
    const accessToken = await getGraphToken(se);

    // expiration: max approx 3 days for messages (Microsoft limit)
    const expireAt = new Date(Date.now() + 2.5 * 24 * 60 * 60 * 1000).toISOString();

    const webhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/helpdesk/outlook-webhook`;

    const res = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        changeType: "created",
        notificationUrl: webhookUrl,
        resource: `users/${se.email}/mailFolders('Inbox')/messages`,
        expirationDateTime: expireAt,
        clientState: process.env.OUTLOOK_WEBHOOK_SECRET,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return Response.json(
        { success: false, msg: "Subscription create failed", error: data },
        { status: 400 }
      );
    }

    // ✅ save subscription details in DB (recommended)
    se.subscriptionId = data.id;
    se.subscriptionExpiresAt = data.expirationDateTime;
    await company.save();

    return Response.json({
      success: true,
      msg: "Subscription created",
      subscription: {
        id: data.id,
        expirationDateTime: data.expirationDateTime,
        notificationUrl: data.notificationUrl,
        resource: data.resource,
      },
    });
  } catch (err) {
    console.error("Subscription Create Error:", err);
    return Response.json({ success: false, msg: err.message }, { status: 500 });
  }
}
