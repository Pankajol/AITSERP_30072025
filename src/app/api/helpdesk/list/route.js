import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
export async function GET(req) {
  await dbConnect();

  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ success:false, msg:"Unauthorized" }, { status:401 });

  let user;
  try { user = verifyJWT(token); } 
  catch { return NextResponse.json({ success:false, msg:"Invalid token" }, { status:403 }); }

  let query = { companyId: user.companyId };

  if (user.roles?.includes("customer"))
    query.customerId = user.id;

  if (user.roles?.includes("agent"))
    query.agentId = user.id;

  const tickets = await Ticket.find(query)
    .sort({ createdAt: -1 });

  return NextResponse.json({ success: true, tickets });
}