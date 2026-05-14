export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import SlaPolicy from "@/models/helpdesk/SlaPolicy";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

/* ================= UPDATE SLA ================= */
export async function PUT(req,{params}) {

  await dbConnect();

  const token = getTokenFromHeader(req);
  const user = verifyJWT(token);

  if (!user) {
    return Response.json({ success:false },{ status:401 });
  }

  const body = await req.json();

  const updated = await SlaPolicy.findOneAndUpdate(
    {
      _id: params.id,
      companyId: user.companyId   // 🔥 security filter
    },
    {
      name: body.name,
      firstResponseMinutes: Number(body.firstResponseMinutes),
      resolutionMinutes: Number(body.resolutionMinutes),
      priority: body.priority,
      isActive: body.isActive
    },
    { new:true }
  );

  return Response.json({
    success:true,
    data:updated
  });
}


/* ================= DELETE SLA ================= */
export async function DELETE(req,{params}) {

  await dbConnect();

  const token = getTokenFromHeader(req);
  const user = verifyJWT(token);

  if (!user) {
    return Response.json({ success:false },{ status:401 });
  }

  await SlaPolicy.findOneAndDelete({
    _id: params.id,
    companyId: user.companyId
  });

  return Response.json({ success:true });
}