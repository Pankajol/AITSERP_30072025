import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Campaign from "@/models/EmailCampaign";

// ==========================================================
//  CREATE CAMPAIGN (POST)
// ==========================================================
export async function POST(req) {
  try {
    await dbConnect();

    // ---------------- AUTH CHECK ----------------
    const token = getTokenFromHeader(req);
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const decoded = verifyJWT(token);
    if (!decoded?.companyId) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 403,
      });
    }

    // ----------------------------------------------------
    // Read Form Body
    // ----------------------------------------------------
    const body = await req.json();

    const {
      campaignName,
      scheduledTime,
      channel,
      sender,
      content,
      emailSubject,
      ctaText,
      attachments,
      recipientSource,
      recipientList,
      recipientManual,
      recipientExcelPath,
    } = body;

    // ----------------------------------------------------
    // VALIDATION BASED ON CHANNEL TYPE
    // ----------------------------------------------------

    if (!campaignName)
      return badRequest("Campaign Name is required");

    if (!scheduledTime)
      return badRequest("Scheduled time is required");

    if (!channel || !["email", "whatsapp"].includes(channel))
      return badRequest("Invalid channel type");

    if (!sender)
      return badRequest("Sender is required");

    if (!content)
      return badRequest("Content is required");

    // Email Specific
    if (channel === "email") {
      if (!emailSubject) return badRequest("Email subject required for email campaigns");
      if (!ctaText) return badRequest("CTA text is required for email campaigns");
    }

    // WhatsApp Specific
    if (channel === "whatsapp") {
      if (emailSubject) delete body.emailSubject; // Not allowed
      if (ctaText) delete body.ctaText;           // Not allowed
    }

    // ----------------------------------------------------
    // RECIPIENT SOURCE CHECK
    // ----------------------------------------------------
    if (!recipientSource || !["segment", "excel", "manual"].includes(recipientSource)) {
      return badRequest("Invalid recipientSource type");
    }

    if (recipientSource === "segment" && !recipientList) {
      return badRequest("Recipient segment is required");
    }

    if (recipientSource === "manual" && !recipientManual) {
      return badRequest("Manual recipients required");
    }

    if (recipientSource === "excel" && !recipientExcelPath) {
      return badRequest("Excel file path required");
    }

    // ==========================================================
    // SAVE CAMPAIGN
    // ==========================================================
    const campaign = await Campaign.create({
      ...body,
      companyId: decoded.companyId,
      createdBy: decoded.id,
    });

    return new Response(
      JSON.stringify({ success: true, data: campaign }),
      { status: 201 }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}

// Helper: Bad Request Response
function badRequest(message) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status: 400,
  });
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

    const campaigns = await Campaign.find({
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
