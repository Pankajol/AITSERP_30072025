import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import EmailMaster from "@/models/emailMaster/emailMaster";
import crypto from "crypto";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export const runtime = "nodejs";

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
  if (pwd.length <= 4) return "*".repeat(pwd.length);
  return pwd.slice(0, 2) + "********" + pwd.slice(-2);
}

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

/* =====================================================
   GET /api/email-masters  -> list
===================================================== */
export async function GET(req) {
  try {
    await dbConnect();

    const companyId = await getCompanyId(req);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const items = await EmailMaster.find({ companyId })
      .sort({ createdAt: -1 })
      .lean();

    const safe = items.map((i) => {
      delete i.encryptedAppPassword;
      return i;
    });

    return NextResponse.json(safe);
  } catch (err) {
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}

/* =====================================================
   POST /api/email-masters  -> create
===================================================== */
export async function POST(req) {
  try {
    await dbConnect();

    const companyId = await getCompanyId(req);
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    if (!body.email || !body.appPassword) {
      return NextResponse.json(
        { error: "email & appPassword required" },
        { status: 400 }
      );
    }

    const doc = await EmailMaster.create({
      companyId,
      email: body.email.toLowerCase(),
      purpose: body.purpose || "",
      service: body.service || "gmail",
      recoveryEmail: body.recoveryEmail || "",
      owner: body.owner || "",
      maskedAppPassword: maskPassword(body.appPassword),
      encryptedAppPassword: encrypt(body.appPassword),
      status: body.status || "Active",
      notes: body.notes || "",
      lastUpdatedBy: body.lastUpdatedBy || "",
    });

    const safe = doc.toObject();
    delete safe.encryptedAppPassword;

    return NextResponse.json(safe, { status: 201 });
  } catch (err) {
    if (err.code === 11000) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}
