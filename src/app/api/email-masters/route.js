// /app/api/email-masters/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import EmailMaster from "@/models/emailMaster/emailMaster";
import crypto from "crypto";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export const runtime = "nodejs";

/** Encryption config */
const ALGO = "aes-256-cbc";
const KEY = process.env.ENCRYPTION_KEY || "";

/* --- crypto helpers --- */
function encrypt(text = "") {
  if (!KEY || KEY.length < 32) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, Buffer.from(KEY.slice(0, 32)), iv);
  let encrypted = cipher.update(String(text), "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(enc = "") {
  if (!KEY || KEY.length < 32) return enc;
  try {
    const parts = enc.split(":");
    const iv = Buffer.from(parts.shift(), "hex");
    const encryptedText = Buffer.from(parts.join(":"), "hex");
    const decipher = crypto.createDecipheriv(ALGO, Buffer.from(KEY.slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    return "";
  }
}

function maskPassword(pwd = "") {
  if (!pwd) return "";
  if (pwd.length <= 4) return "*".repeat(pwd.length);
  return pwd.slice(0, 2) + "********" + pwd.slice(-2);
}

/* --- auth helpers --- */
async function getVerifiedPayload(req) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return null;
    // verifyJWT should throw if invalid
    const payload = await verifyJWT(token);
    return payload || null;
  } catch (err) {
    return null;
  }
}

async function getCompanyIdFromRequest(req, bodyCandidate) {
  const payload = await getVerifiedPayload(req);
  if (payload) {
    return payload.companyId || payload.cid || payload.company || null;
  }
  // fallback to query param
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("companyId");
    if (q) return q;
  } catch {}
  if (bodyCandidate && bodyCandidate.companyId) return bodyCandidate.companyId;
  return null;
}

/* --------------------------
   GET  /api/email-masters  -> list
   POST /api/email-masters -> create
   PATCH /api/email-masters?op=unmask&id=... -> unmask password (collection-level)
---------------------------*/

async function listEmails(req) {
  await dbConnect();

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const status = url.searchParams.get("status") || "";

  const companyId = await getCompanyIdFromRequest(req);
  if (!companyId) return NextResponse.json({ error: "Unauthorized: companyId required" }, { status: 401 });

  const filter = { companyId };
  if (search) {
    const re = { $regex: search, $options: "i" };
    filter.$or = [{ email: re }, { purpose: re }, { owner: re }];
  }
  if (status) filter.status = status;

  const items = await EmailMaster.find(filter).sort({ createdAt: -1 }).lean();
  const safe = items.map((i) => {
    const copy = { ...i };
    delete copy.encryptedAppPassword;
    return copy;
  });

  return NextResponse.json(safe);
}

async function createEmail(req) {
  const body = await req.json();
  await dbConnect();

  const companyId = await getCompanyIdFromRequest(req, body);
  if (!companyId) return NextResponse.json({ error: "Unauthorized: companyId required" }, { status: 401 });

  if (!body.email) return NextResponse.json({ error: "email required" }, { status: 400 });
  if (!body.appPassword) return NextResponse.json({ error: "appPassword required" }, { status: 400 });

  const encrypted = encrypt(body.appPassword);
  const masked = maskPassword(body.appPassword);

  try {
    const doc = await EmailMaster.create({
      companyId,
      email: String(body.email).trim().toLowerCase(),
      purpose: body.purpose || "",
      service: body.service || "gmail",
      recoveryEmail: body.recoveryEmail || "",
      owner: body.owner || "",
      maskedAppPassword: masked,
      encryptedAppPassword: encrypted,
      status: body.status || "Active",
      notes: body.notes || "",
      lastUpdatedBy: body.lastUpdatedBy || "",
    });
    const safe = doc.toObject();
    delete safe.encryptedAppPassword;
    return NextResponse.json(safe, { status: 201 });
  } catch (err) {
    if (err?.code === 11000) {
      return NextResponse.json({ error: "Email already exists for this company" }, { status: 409 });
    }
    return NextResponse.json({ error: "Create failed", details: err.message }, { status: 500 });
  }
}

/* PATCH handler for collection (supports op=unmask&id=...) */
async function patchHandler(req) {
  await dbConnect();

  const url = new URL(req.url);
  const op = url.searchParams.get("op");
  const id = url.searchParams.get("id");

  if (!op) return NextResponse.json({ error: "op required" }, { status: 400 });

  if (op === "unmask") {
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const companyId = await getCompanyIdFromRequest(req);
    if (!companyId) return NextResponse.json({ error: "Unauthorized: companyId required" }, { status: 401 });

    const doc = await EmailMaster.findOne({ _id: id, companyId }).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Production: enforce RBAC and write audit log here
    const password = decrypt(doc.encryptedAppPassword || "");
    return NextResponse.json({ password });
  }

  return NextResponse.json({ error: "Unknown op" }, { status: 400 });
}

/* Exports */
export async function GET(req) {
  try {
    return await listEmails(req);
  } catch (err) {
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    return await createEmail(req);
  } catch (err) {
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    return await patchHandler(req);
  } catch (err) {
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
}
