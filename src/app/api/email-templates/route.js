// app/api/email-templates/route.js
import dbConnect from "@/lib/db";
import EmailTemplate from "@/models/emailMaster/EmailTemplate";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

async function requireAuth(req) {
  const token = getTokenFromHeader(req); // your helper should read Authorization header
  if (!token) throw new Error("Missing token");
  const user = await verifyJWT(token); // expect { id, email, companyId, roles... }
  if (!user) throw new Error("Invalid token");
  return user;
}

export async function GET(req) {
  try {
    await dbConnect();
    const user = await requireAuth(req);

    // optional query param to override (admin use) ?companyId=...
    const url = new URL(req.url);
    const qCompany = url.searchParams.get("companyId");
    const companyId = qCompany || user.companyId;
    if (!companyId) {
      return new Response(JSON.stringify({ error: "companyId not available in token and not provided" }), { status: 400 });
    }

    const list = await EmailTemplate.find({ companyId }).sort({ createdAt: -1 }).lean();
    return new Response(JSON.stringify({ data: list }), { status: 200 });
  } catch (err) {
    console.error("GET /api/email-templates error:", err);
    const status = err.message && (err.message.toLowerCase().includes("token") || err.message.toLowerCase().includes("missing")) ? 401 : 400;
    return new Response(JSON.stringify({ error: err.message }), { status });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const user = await requireAuth(req);
    const body = await req.json();

    if (!body.subject || !body.contentHtml) {
      return new Response(JSON.stringify({ error: "subject and contentHtml required" }), { status: 400 });
    }

    // companyId comes from token primarily. If token has none and body.companyId provided, use it.
    const companyId = user.companyId || body.companyId;
    if (!companyId) {
      return new Response(JSON.stringify({ error: "companyId required" }), { status: 400 });
    }

    const doc = new EmailTemplate({
      name: body.name || (body.subject && body.subject.slice(0, 60)),
      subject: body.subject,
      contentHtml: body.contentHtml,
      textPlain: body.textPlain || (body.contentHtml ? body.contentHtml.replace(/<[^>]*>/g, " ").trim().slice(0, 2000) : ""),
      companyId,
      createdBy: user.id || undefined,
      meta: body.meta || {},
    });

    const saved = await doc.save();
    return new Response(JSON.stringify({ data: saved }), { status: 201 });
  } catch (err) {
    console.error("POST /api/email-templates error:", err);
    const status = err.message && err.message.toLowerCase().includes("token") ? 401 : 400;
    return new Response(JSON.stringify({ error: err.message }), { status });
  }
}
