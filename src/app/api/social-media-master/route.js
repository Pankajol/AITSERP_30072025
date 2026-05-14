export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import SocialMediaMaster from "@/models/SocialMediaMaster";
import crypto from "crypto";

// ── helpers ───────────────────────────────────────────
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

// ── Encrypt ───────────────────────────────────────────
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

// ── Decrypt ───────────────────────────────────────────
function decrypt(encrypted) {
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

// ── Encrypt all sensitive fields before saving ────────
function encryptPlatform(data = {}) {
  if (!data) return data;
  const enc = { ...data };
  if (enc.token)             enc.token             = encrypt(enc.token);
  if (enc.secret)            enc.secret            = encrypt(enc.secret);
  if (enc.extra1)            enc.extra1            = encrypt(enc.extra1);
  if (enc.extra2)            enc.extra2            = encrypt(enc.extra2);
  if (enc.appSecret)         enc.appSecret         = encrypt(enc.appSecret);
  if (enc.accessToken)       enc.accessToken       = encrypt(enc.accessToken);
  if (enc.accessTokenSecret) enc.accessTokenSecret = encrypt(enc.accessTokenSecret);
  return enc;
}

// ── Mask sensitive fields for frontend response ───────
function maskPlatform(data = {}) {
  if (!data) return data;
  const masked = { ...data };
  const sensitiveKeys = ["token","secret","extra1","extra2","appSecret","accessToken","accessTokenSecret"];
  sensitiveKeys.forEach((k) => {
    if (masked[k]) masked[k] = "••••••••••••";
  });
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

// ═══════════════════════════════════════════
// GET — fetch company's social master
// ═══════════════════════════════════════════
export async function GET(req) {
  try {
    await dbConnect();
    const { decoded, error } = authCheck(req);
    if (error) return error;

    const master = await SocialMediaMaster.findOne({
      companyId: decoded.companyId,
    }).lean();

    if (!master) return json({ success: true, data: null });

    // Mask secrets before sending to frontend
    return json({ success: true, data: maskMaster(master) });
  } catch (err) {
    return json({ success: false, error: err?.message }, 500);
  }
}

// ═══════════════════════════════════════════
// POST — create social master
// ═══════════════════════════════════════════
export async function POST(req) {
  try {
    await dbConnect();
    const { decoded, error } = authCheck(req);
    if (error) return error;

    const body = await req.json().catch(() => null);
    if (!body) return json({ success: false, error: "Missing body" }, 400);

    // Check if already exists
    const existing = await SocialMediaMaster.findOne({ companyId: decoded.companyId });
    if (existing) return json({ success: false, error: "Master already exists. Use PUT to update." }, 409);

    const doc = buildDoc(body, decoded);
    const master = await SocialMediaMaster.create(doc);

    return json({ success: true, data: maskMaster(master.toObject()) }, 201);
  } catch (err) {
    console.error("CREATE SOCIAL MASTER:", err?.message);
    return json({ success: false, error: err?.message }, 500);
  }
}

// ═══════════════════════════════════════════
// PUT — update social master (upsert)
// ═══════════════════════════════════════════
export async function PUT(req) {
  try {
    await dbConnect();
    const { decoded, error } = authCheck(req);
    if (error) return error;

    const body = await req.json().catch(() => null);
    if (!body) return json({ success: false, error: "Missing body" }, 400);

    const doc = buildDoc(body, decoded);

    const master = await SocialMediaMaster.findOneAndUpdate(
      { companyId: decoded.companyId },
      { $set: doc },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    return json({ success: true, data: maskMaster(master) });
  } catch (err) {
    console.error("UPDATE SOCIAL MASTER:", err?.message);
    return json({ success: false, error: err?.message }, 500);
  }
}

// ── Build doc with encryption ─────────────────────────
function buildDoc(body, decoded) {
  const {
    masterName, status,
    whatsapp, instagram, facebook,
    youtube, twitter, linkedin,
    customPlatforms,
  } = body;

  return {
    companyId:  decoded.companyId,
    createdBy:  decoded.id || null,
    masterName: masterName || "Social Media Master",
    status:     status || "Active",
    whatsapp:   whatsapp   ? encryptPlatform(whatsapp)   : undefined,
    instagram:  instagram  ? encryptPlatform(instagram)  : undefined,
    facebook:   facebook   ? encryptPlatform(facebook)   : undefined,
    youtube:    youtube    ? encryptPlatform(youtube)    : undefined,
    twitter:    twitter    ? encryptPlatform(twitter)    : undefined,
    linkedin:   linkedin   ? encryptPlatform(linkedin)   : undefined,
    customPlatforms: Array.isArray(customPlatforms)
      ? customPlatforms.map((cp) => encryptPlatform(cp))
      : undefined,
  };
}

// ── Also export decrypt for use in campaign route ─────
export { decrypt, encrypt };