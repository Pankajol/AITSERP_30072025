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
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/outlook`; // your webhook endpoint

  const res = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      changeType: "created,updated",
      notificationUrl: callbackUrl,
      resource: `users/${userEmail}/messages`,
      expirationDateTime: new Date(Date.now() + 4230 * 60 * 1000).toISOString(), // ~3 days
      clientState: webhookSecret,
    }),
  });

  const data = await res.json();
  if (!data.id) {
    console.error("Failed to create subscription for", userEmail, data);
  } else {
    console.log("✅ Subscription created for", userEmail);
  }
}

async function main() {
  await dbConnect();

  const companies = await Company.find({
    "supportEmails.type": "outlook",
    "supportEmails.inboundEnabled": true,
  }).select("supportEmails");

  for (const company of companies) {
    for (const supportEmail of company.supportEmails) {
      if (supportEmail.type !== "outlook") continue;

      try {
        const token = await getGraphToken(supportEmail);
        await createSubscription({
          token,
          userEmail: supportEmail.email,
          webhookSecret: supportEmail.webhookSecret,
        });
      } catch (err) {
        console.error("❌ Error creating subscription for", supportEmail.email, err);
      }
    }
  }

  process.exit();
}

main();
