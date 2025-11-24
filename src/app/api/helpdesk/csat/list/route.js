import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CSAT from "@/models/helpdesk/CSAT";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();

  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ success:false, msg:"Unauthorized" }, { status:401 });
  let user;
  try { user = verifyJWT(token); } catch {}

  if (!user.roles?.includes("admin")) return NextResponse.json({ success:false, msg:"Admin only" }, { status:403 });

  const csats = await CSAT.find({ companyId: user.companyId }).sort({ createdAt: -1 });

  return NextResponse.json({ success:true, csats });
}
