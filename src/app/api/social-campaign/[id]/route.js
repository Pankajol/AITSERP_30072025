export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import SocialCampaign from "@/models/SocialCampaign";

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { "Content-Type": "application/json" },
  });
}

function authCheck(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: json({ success: false, error: "Unauthorized" }, 401) };
  try {
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) return { error: json({ success: false, error: "No company" }, 403) };
    return { decoded };
  } catch {
    return { error: json({ success: false, error: "Invalid token" }, 401) };
  }
}

// ════════════════════════════════════════════════════
// GET /api/social-campaign/[id]
// ════════════════════════════════════════════════════
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { decoded, error } = authCheck(req);
    if (error) return error;

    const campaign = await SocialCampaign.findOne({
      _id: params.id,
      companyId: decoded.companyId,
    }).lean();

    if (!campaign) return json({ success: false, error: "Campaign not found" }, 404);
    return json({ success: true, data: campaign });
  } catch (err) {
    return json({ success: false, error: err?.message }, 500);
  }
}

// ════════════════════════════════════════════════════
// PUT /api/social-campaign/[id]
// Update campaign — only if status is Draft or Scheduled
// ════════════════════════════════════════════════════
export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { decoded, error } = authCheck(req);
    if (error) return error;

    const existing = await SocialCampaign.findOne({
      _id: params.id,
      companyId: decoded.companyId,
    });

    if (!existing) return json({ success: false, error: "Campaign not found" }, 404);

    if (["Sent", "Sending"].includes(existing.status)) {
      return json({ success: false, error: "Cannot edit a campaign that has been sent" }, 400);
    }

    const body = await req.json().catch(() => null);
    if (!body) return json({ success: false, error: "Missing body" }, 400);

    const allowedUpdates = [
      "campaignName", "platforms", "contentType", "sendModes",
      "topic", "industry", "caption", "hashtags",
      "mediaUrls", "scheduledTime",
      "emailRecipients", "whatsappNumbers",
      "videoScript", "imagePrompt", "status",
    ];

    allowedUpdates.forEach((key) => {
      if (body[key] !== undefined) existing[key] = body[key];
    });

    // Recalculate status if scheduledTime changed
    if (body.scheduledTime) existing.status = "Scheduled";

    await existing.save();
    return json({ success: true, data: existing });
  } catch (err) {
    return json({ success: false, error: err?.message }, 500);
  }
}

// ════════════════════════════════════════════════════
// PATCH /api/social-campaign/[id]
// Quick field toggle: { field: "status", value: "Draft" }
// ════════════════════════════════════════════════════
export async function PATCH(req, { params }) {
  try {
    await dbConnect();
    const { decoded, error } = authCheck(req);
    if (error) return error;

    const body = await req.json().catch(() => null);
    const { field, value } = body || {};

    const allowedPatch = ["status", "scheduledTime", "campaignName"];
    if (!allowedPatch.includes(field)) {
      return json({ success: false, error: `Cannot patch: ${field}` }, 400);
    }

    const campaign = await SocialCampaign.findOneAndUpdate(
      { _id: params.id, companyId: decoded.companyId },
      { $set: { [field]: value } },
      { new: true }
    ).lean();

    if (!campaign) return json({ success: false, error: "Campaign not found" }, 404);
    return json({ success: true, data: campaign });
  } catch (err) {
    return json({ success: false, error: err?.message }, 500);
  }
}

// ════════════════════════════════════════════════════
// DELETE /api/social-campaign/[id]
// ════════════════════════════════════════════════════
export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const { decoded, error } = authCheck(req);
    if (error) return error;

    const campaign = await SocialCampaign.findOne({
      _id: params.id,
      companyId: decoded.companyId,
    });

    if (!campaign) return json({ success: false, error: "Campaign not found" }, 404);

    if (campaign.status === "Sending") {
      return json({ success: false, error: "Cannot delete a campaign that is currently sending" }, 400);
    }

    await campaign.deleteOne();
    return json({ success: true, message: "Campaign deleted" });
  } catch (err) {
    return json({ success: false, error: err?.message }, 500);
  }
}