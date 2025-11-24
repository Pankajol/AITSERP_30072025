import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import CSAT from "@/models/helpdesk/CSAT";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();

  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ success:false, msg:"Unauthorized" }, { status:401 });
  let user;
  try { user = verifyJWT(token); } catch {}

  if (!user.roles?.includes("admin")) return NextResponse.json({ success:false, msg:"Admin only" }, { status:403 });

  const companyId = user.companyId;

  const total = await Ticket.countDocuments({ companyId });
  const open = await Ticket.countDocuments({ companyId, status: "open" });
  const inProgress = await Ticket.countDocuments({ companyId, status: "in-progress" });
  const closed = await Ticket.countDocuments({ companyId, status: "closed" });
  const avgCSAT = await CSAT.aggregate([
    { $match: { companyId: mongoose.Types.ObjectId(companyId) } },
    { $group: { _id: null, avg: { $avg: "$rating" } } }
  ]);

  return NextResponse.json({
    success: true,
    total,
    open,
    inProgress,
    closed,
    avgCSAT: (avgCSAT[0] && avgCSAT[0].avg) ? avgCSAT[0].avg : null
  });
}
