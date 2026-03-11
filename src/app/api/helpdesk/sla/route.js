export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import SlaPolicy from "@/models/helpdesk/SlaPolicy";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

/* ================= GET SLA LIST ================= */
export async function GET(req) {

  await dbConnect();

  /* 🔐 AUTH CHECK */
  const token = getTokenFromHeader(req);
  const user = verifyJWT(token);

  if (!user) {
    return Response.json({ success:false },{ status:401 });
  }

  /* ✅ Only company SLA */
  const list = await SlaPolicy.find({
    companyId: user.companyId
  }).sort({ createdAt:-1 });

  return Response.json(list);
}


/* ================= CREATE SLA ================= */
export async function POST(req) {

  await dbConnect();

  const token = getTokenFromHeader(req);
  const user = verifyJWT(token);

  if (!user) {
    return Response.json({ success:false },{ status:401 });
  }

  const body = await req.json();

  const created = await SlaPolicy.create({
    companyId: user.companyId,   // 🔥 NEVER TRUST FRONTEND
    name: body.name,
    firstResponseMinutes: Number(body.firstResponseMinutes),
    resolutionMinutes: Number(body.resolutionMinutes),
    priority: body.priority || "normal",
    isActive:true
  });

  return Response.json({
    success:true,
    data:created
  });
}