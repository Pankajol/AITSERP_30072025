// app/api/email-templates/[id]/route.js
import dbConnect from "@/lib/db";
import EmailTemplate from "@/models/emailMaster/EmailTemplate";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

async function requireAuth(req) {
  const token = getTokenFromHeader(req);
  if (!token) throw new Error("Missing token");
  const user = await verifyJWT(token);
  if (!user) throw new Error("Invalid token");
  return user;
}

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const user = await requireAuth(req);
    const { id } = params;
    const doc = await EmailTemplate.findById(id).lean();
    if (!doc) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

    // ensure same company
    if (String(doc.companyId) !== String(user.companyId)) {
      return new Response(JSON.stringify({ error: "Unauthorized (company mismatch)" }), { status: 403 });
    }

    return new Response(JSON.stringify({ data: doc }), { status: 200 });
  } catch (err) {
    console.error("GET /api/email-templates/[id] error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const user = await requireAuth(req);
    const { id } = params;
    const body = await req.json();

    const existing = await EmailTemplate.findById(id);
    if (!existing) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

    if (String(existing.companyId) !== String(user.companyId)) {
      return new Response(JSON.stringify({ error: "Unauthorized (company mismatch)" }), { status: 403 });
    }

    existing.name = body.name ?? existing.name;
    existing.subject = body.subject ?? existing.subject;
    existing.contentHtml = body.contentHtml ?? existing.contentHtml;
    existing.textPlain = body.textPlain ?? (existing.contentHtml ? existing.contentHtml.replace(/<[^>]*>/g, " ").trim().slice(0, 2000) : existing.textPlain);
    existing.meta = body.meta ?? existing.meta;
    // don't allow changing companyId unless user is allowed - keep same
    await existing.save();

    return new Response(JSON.stringify({ data: existing }), { status: 200 });
  } catch (err) {
    console.error("PUT /api/email-templates/[id] error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const user = await requireAuth(req);
    const { id } = params;

    const existing = await EmailTemplate.findById(id);
    if (!existing) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

    if (String(existing.companyId) !== String(user.companyId)) {
      return new Response(JSON.stringify({ error: "Unauthorized (company mismatch)" }), { status: 403 });
    }

    await EmailTemplate.findByIdAndDelete(id);
    return new Response(JSON.stringify({ data: { id } }), { status: 200 });
  } catch (err) {
    console.error("DELETE /api/email-templates/[id] error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
}
