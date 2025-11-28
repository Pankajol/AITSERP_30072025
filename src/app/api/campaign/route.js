export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import EmailCampaign from "@/models/EmailCampaign";


// helper
function badRequest(message) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status: 400,
  });
}

// ==========================================================
//  CREATE CAMPAIGN (POST)
// ==========================================================
export async function POST(req) {
  try {
    await dbConnect();

    // ---------------- AUTH CHECK ----------------
    const token = getTokenFromHeader(req);
    if (!token) return badRequest("Unauthorized");

    const decoded = verifyJWT(token);
    if (!decoded?.companyId) return badRequest("Invalid token");

    const body = await req.json();

    const {
      campaignName,
      scheduledTime,
      channel,
      sender,
      content,
      emailSubject,
      ctaText,
      recipientSource,
      recipientList,
      recipientManual,
      recipientExcelPath,
    } = body;

    if (!campaignName) return badRequest("Campaign Name is required");
    if (!scheduledTime) return badRequest("Scheduled time is required");
    if (!channel || !["email", "whatsapp"].includes(channel))
      return badRequest("Invalid channel type");
    if (!sender) return badRequest("Sender is required");
    if (!content) return badRequest("Content is required");

    // Email Specific
    if (channel === "email") {
      if (!emailSubject) return badRequest("Email subject required");
      if (!ctaText) return badRequest("CTA text required");
    }

    // WhatsApp Specific
    if (channel === "whatsapp") {
      delete body.emailSubject;
      delete body.ctaText;
    }

    // Recipient Source
    if (!recipientSource || !["segment", "excel", "manual"].includes(recipientSource))
      return badRequest("Invalid recipientSource type");

    if (recipientSource === "segment" && !recipientList)
      return badRequest("Recipient segment is required");

    if (recipientSource === "manual" && !recipientManual)
      return badRequest("Manual recipients required");

    if (recipientSource === "excel" && !recipientExcelPath)
      return badRequest("Excel file path required");

    // save
    // convert to IST before saving
const istDate = new Date(
  new Date(scheduledTime).getTime() + (5.5 * 60 * 60 * 1000)
);




    const campaign = await EmailCampaign.create({
      ...body,
      scheduledTime: istDate,
      companyId: decoded.companyId,
      createdBy: decoded.id,
      status: "Scheduled",
    });

    return new Response(JSON.stringify({ success: true, data: campaign }), {
      status: 201,
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}



// ==========================================================
//  GET ALL CAMPAIGNS — COMPANY SPECIFIC
// ==========================================================
export async function GET(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });

    const decoded = verifyJWT(token);

    const campaigns = await EmailCampaign.find({
      companyId: decoded.companyId,
    }).sort({ createdAt: -1 });

    return new Response(
      JSON.stringify({ success: true, data: campaigns }),
      { status: 200 }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}
