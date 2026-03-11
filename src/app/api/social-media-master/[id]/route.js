export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import SocialMediaMaster from "@/models/SocialMediaMaster";
import SocialCampaign from "@/models/SocialCampaign";
import crypto from "crypto";

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

function encrypt(text) {
  if (!text) return null;
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) return text;
  try {
    const key    = crypto.createHash("sha256").update(secret).digest();
    const iv     = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let enc = cipher.update(text, "utf8", "hex");
    enc += cipher.final("hex");
    return iv.toString("hex") + ":" + enc;
  } catch { return text; }
}

export function decrypt(encrypted) {
  if (!encrypted) return null;
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) return encrypted;
  try {
    const [ivHex, encHex] = encrypted.split(":");
    if (!ivHex || !encHex) return encrypted;
    const key      = crypto.createHash("sha256").update(secret).digest();
    const iv       = Buffer.from(ivHex, "hex");
    const encBuf   = Buffer.from(encHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let dec = decipher.update(encBuf, undefined, "utf8");
    dec += decipher.final("utf8");
    return dec;
  } catch { return null; }
}

function encryptPlatform(data = {}) {
  if (!data) return data;
  const enc = { ...data };
  const sensitiveKeys = ["token","secret","extra1","extra2","appSecret","accessToken","accessTokenSecret"];
  sensitiveKeys.forEach((k) => {
    // Only re-encrypt if it's a new plain value (not already masked or encrypted)
    if (enc[k] && enc[k] !== "••••••••••••" && !enc[k].includes(":")) {
      enc[k] = encrypt(enc[k]);
    }
    // If masked → skip (keep existing DB value, handled via merge in PUT)
    if (enc[k] === "••••••••••••") delete enc[k];
  });
  return enc;
}

function maskPlatform(data = {}) {
  if (!data) return data;
  const masked = { ...data };
  const sensitiveKeys = ["token","secret","extra1","extra2","appSecret","accessToken","accessTokenSecret"];
  sensitiveKeys.forEach((k) => { if (masked[k]) masked[k] = "••••••••••••"; });
  return masked;
}

function maskMaster(master) {
  if (!master) return null;
  const m = JSON.parse(JSON.stringify(master));
  ["whatsapp","instagram","facebook","youtube","twitter","linkedin"].forEach((p) => {
    if (m[p]) m[p] = maskPlatform(m[p]);
  });
  if (Array.isArray(m.customPlatforms)) {
    m.customPlatforms = m.customPlatforms.map((cp) => maskPlatform(cp));
  }
  return m;
}

// ════════════════════════════════════════════════════
// GET /api/social-media-master/[id]
// Get single master by _id (company-scoped)
// Also supports ?section=whatsapp to get only one platform
// ════════════════════════════════════════════════════
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { decoded, error } = authCheck(req);
    if (error) return error;

    const { id } = params;
    const url = new URL(req.url);
    const section = url.searchParams.get("section"); // e.g. ?section=whatsapp

    const master = await SocialMediaMaster.findOne({
      _id: id,
      companyId: decoded.companyId,
    }).lean();

    if (!master) return json({ success: false, error: "Master not found" }, 404);

    const masked = maskMaster(master);

    // Return only a specific platform section if requested
    if (section && masked[section] !== undefined) {
      return json({ success: true, data: { [section]: masked[section] } });
    }

    return json({ success: true, data: masked });
  } catch (err) {
    return json({ success: false, error: err?.message }, 500);
  }
}

// ════════════════════════════════════════════════════
// PUT /api/social-media-master/[id]
// Partial update — only update fields sent
// Merges secrets: if "••••••••••••" sent, keep existing DB value
// ════════════════════════════════════════════════════
export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { decoded, error } = authCheck(req);
    if (error) return error;

    const { id } = params;

    const body = await req.json().catch(() => null);
    if (!body) return json({ success: false, error: "Missing body" }, 400);

    // Fetch existing to merge secrets
    const existing = await SocialMediaMaster.findOne({
      _id: id,
      companyId: decoded.companyId,
    }).lean();

    if (!existing) return json({ success: false, error: "Master not found" }, 404);

    const platformKeys = ["whatsapp","instagram","facebook","youtube","twitter","linkedin"];
    const sensitiveKeys = ["token","secret","extra1","extra2","appSecret","accessToken","accessTokenSecret"];
    const updateDoc = {};

    if (body.masterName) updateDoc.masterName = body.masterName;
    if (body.status)     updateDoc.status     = body.status;

    // Per-platform merge
    platformKeys.forEach((p) => {
      if (!body[p]) return;
      const incoming  = { ...body[p] };
      const existingP = existing[p] || {};

      // For each secret field: if incoming is masked/empty → keep DB encrypted value
      sensitiveKeys.forEach((k) => {
        if (!incoming[k] || incoming[k] === "••••••••••••") {
          if (existingP[k]) incoming[k] = existingP[k]; // keep encrypted
          else delete incoming[k];
        } else {
          incoming[k] = encrypt(incoming[k]); // new value → encrypt
        }
      });

      updateDoc[p] = { ...existingP, ...incoming };
    });

    // Custom platforms
    if (Array.isArray(body.customPlatforms)) {
      updateDoc.customPlatforms = body.customPlatforms.map((cp) => encryptPlatform(cp));
    }

    const updated = await SocialMediaMaster.findByIdAndUpdate(
      id,
      { $set: updateDoc },
      { new: true, runValidators: true }
    ).lean();

    return json({ success: true, data: maskMaster(updated) });
  } catch (err) {
    console.error("PATCH SOCIAL MASTER:", err?.message);
    return json({ success: false, error: err?.message }, 500);
  }
}

// ════════════════════════════════════════════════════
// PATCH /api/social-media-master/[id]
// Toggle a single platform enabled/status quickly
// Body: { platform: "whatsapp", field: "enabled", value: true }
// ════════════════════════════════════════════════════
export async function PATCH(req, { params }) {
  try {
    await dbConnect();
    const { decoded, error } = authCheck(req);
    if (error) return error;

    const { id } = params;
    const body = await req.json().catch(() => null);

    const { platform, field, value } = body || {};
    if (!platform || !field) return json({ success: false, error: "platform and field required" }, 400);

    const allowedFields = ["enabled", "status", "accountName"];
    if (!allowedFields.includes(field)) {
      return json({ success: false, error: `Cannot patch field: ${field}` }, 400);
    }

    const master = await SocialMediaMaster.findOneAndUpdate(
      { _id: id, companyId: decoded.companyId },
      { $set: { [`${platform}.${field}`]: value } },
      { new: true }
    ).lean();

    if (!master) return json({ success: false, error: "Master not found" }, 404);

    return json({ success: true, data: { platform, field, value } });
  } catch (err) {
    return json({ success: false, error: err?.message }, 500);
  }
}

// ════════════════════════════════════════════════════
// DELETE /api/social-media-master/[id]
// Hard delete master — also clears publishedIds from campaigns
// ════════════════════════════════════════════════════
export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const { decoded, error } = authCheck(req);
    if (error) return error;

    const { id } = params;

    const master = await SocialMediaMaster.findOne({
      _id: id,
      companyId: decoded.companyId,
    });

    if (!master) return json({ success: false, error: "Master not found" }, 404);

    await master.deleteOne();

    // Also clear socialMasterId from any campaigns linked to this company
    await SocialCampaign.updateMany(
      { companyId: decoded.companyId },
      { $unset: { socialMasterId: "" } }
    );

    return json({ success: true, message: "Social Media Master deleted" });
  } catch (err) {
    return json({ success: false, error: err?.message }, 500);
  }
}