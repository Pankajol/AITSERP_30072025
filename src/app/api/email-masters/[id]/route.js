// /app/api/email-masters/[id]/route.js
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import EmailMaster from "@/models/emailMaster/emailMaster";
import crypto from "crypto";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

const ALGO = "aes-256-cbc";
const KEY = process.env.ENCRYPTION_KEY || "";

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

/** Extract and verify token; return decoded payload or null */
async function getPayloadFromReq(req) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return null;
    const payload = await verifyJWT(token); // verifyJWT should throw on invalid
    return payload || null;
  } catch (err) {
    return null;
  }
}

/** Helper to get companyId: from verified token payload -> query param -> body */
async function getCompanyIdFromRequest(req, bodyCandidate) {
  const payload = await getPayloadFromReq(req);
  if (payload) {
    return payload.companyId || payload.cid || payload.company || null;
  }
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("companyId");
    if (q) return q;
  } catch {}
  if (bodyCandidate && bodyCandidate.companyId) return bodyCandidate.companyId;
  return null;
}

/* --------------------------
   GET /api/email-masters/:id   -> get single (masked)
   PUT /api/email-masters/:id   -> update (only same company)
   DELETE /api/email-masters/:id -> delete
   PATCH /api/email-masters/:id  -> op=unmask (returns decrypted password) 
---------------------------*/

async function getEmail(req, { params }) {
  await connectDB();
  const id = params.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const companyId = await getCompanyIdFromRequest(req);
  if (!companyId) return NextResponse.json({ error: "Unauthorized: companyId required" }, { status: 401 });

  const doc = await EmailMaster.findOne({ _id: id, companyId }).lean();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  delete doc.encryptedAppPassword;
  return NextResponse.json(doc);
}

async function updateEmail(req, { params }) {
  await connectDB();
  const id = params.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const body = await req.json();
  const companyId = await getCompanyIdFromRequest(req, body);
  if (!companyId) return NextResponse.json({ error: "Unauthorized: companyId required" }, { status: 401 });

  const update = {
    purpose: body.purpose,
    service: body.service,
    recoveryEmail: body.recoveryEmail,
    owner: body.owner,
    status: body.status,
    notes: body.notes,
    lastUpdatedBy: body.lastUpdatedBy,
  };

  if (body.appPassword) {
    update.encryptedAppPassword = encrypt(body.appPassword);
    update.maskedAppPassword = maskPassword(body.appPassword);
  }

  try {
    const doc = await EmailMaster.findOneAndUpdate({ _id: id, companyId }, update, { new: true }).lean();
    if (!doc) return NextResponse.json({ error: "Not found or company mismatch" }, { status: 404 });
    delete doc.encryptedAppPassword;
    return NextResponse.json(doc);
  } catch (err) {
    return NextResponse.json({ error: "Update failed", details: err.message }, { status: 500 });
  }
}

async function deleteEmail(req, { params }) {
  await connectDB();
  const id = params.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId") || (await getCompanyIdFromRequest(req));
  if (!companyId) return NextResponse.json({ error: "Unauthorized: companyId required" }, { status: 401 });

  const deleted = await EmailMaster.findOneAndDelete({ _id: id, companyId });
  if (!deleted) return NextResponse.json({ error: "Not found or company mismatch" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

async function patchOp(req, { params }) {
  await connectDB();
  const id = params.id;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const url = new URL(req.url);
  const op = url.searchParams.get("op");
  const companyId = url.searchParams.get("companyId") || (await getCompanyIdFromRequest(req));
  if (!companyId) return NextResponse.json({ error: "Unauthorized: companyId required" }, { status: 401 });

  if (op === "unmask") {
    const doc = await EmailMaster.findOne({ _id: id, companyId }).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // IMPORTANT: in production verify current user's permission and audit the access
    const decrypted = decrypt(doc.encryptedAppPassword || "");
    return NextResponse.json({ password: decrypted });
  }

  return NextResponse.json({ error: "Unknown op" }, { status: 400 });
}

/* Exports */
export async function GET(req, context) {
  try {
    return await getEmail(req, context);
  } catch (err) {
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
}

export async function PUT(req, context) {
  try {
    return await updateEmail(req, context);
  } catch (err) {
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
}

export async function DELETE(req, context) {
  try {
    return await deleteEmail(req, context);
  } catch (err) {
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
}

export async function PATCH(req, context) {
  try {
    return await patchOp(req, context);
  } catch (err) {
    return NextResponse.json({ error: "Server error", details: err.message }, { status: 500 });
  }
}
