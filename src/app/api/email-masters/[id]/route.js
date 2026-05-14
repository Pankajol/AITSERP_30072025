import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import EmailMaster from "@/models/emailMaster/emailMaster";
import crypto from "crypto";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export const runtime = "nodejs";

/* ================= AUTH ================= */
async function getCompanyId(req) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) return null;
    const payload = await verifyJWT(token);
    return payload?.companyId || payload?.cid || null;
  } catch {
    return null;
  }
}

/* ================= CRYPTO ================= */
const ALGO = "aes-256-cbc";
const KEY = process.env.ENCRYPTION_KEY || "";

function encrypt(text = "") {
  if (!KEY) return text;
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash("sha256").update(KEY).digest();
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let enc = cipher.update(text, "utf8", "hex");
  enc += cipher.final("hex");
  return iv.toString("hex") + ":" + enc;
}

function maskPassword(pwd = "") {
  if (!pwd) return "";
  return pwd.slice(0, 2) + "********" + pwd.slice(-2);
}

/* =====================================================
   GET /api/email-masters/[id]
===================================================== */
export async function GET(req, { params }) {
  await dbConnect();

  const companyId = await getCompanyId(req);
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await EmailMaster.findOne({
    _id: params.id,
    companyId,
  }).lean();

  if (!doc)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  delete doc.encryptedAppPassword;
  return NextResponse.json(doc);
}

/* =====================================================
   PUT /api/email-masters/[id]
===================================================== */
export async function PUT(req, { params }) {
  await dbConnect();

  const companyId = await getCompanyId(req);
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const update = { ...body };
  delete update._id;

  if (body.appPassword) {
    update.encryptedAppPassword = encrypt(body.appPassword);
    update.maskedAppPassword = maskPassword(body.appPassword);
  }

  const updated = await EmailMaster.findOneAndUpdate(
    { _id: params.id, companyId },
    update,
    { new: true }
  ).lean();

  if (!updated)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  delete updated.encryptedAppPassword;
  return NextResponse.json(updated);
}

/* =====================================================
   DELETE /api/email-masters/[id]
===================================================== */
export async function DELETE(req, { params }) {
  await dbConnect();

  const companyId = await getCompanyId(req);
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deleted = await EmailMaster.findOneAndDelete({
    _id: params.id,
    companyId,
  });

  if (!deleted)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
