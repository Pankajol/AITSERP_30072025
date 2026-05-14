import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CSAT from "@/models/helpdesk/CSAT";
import Ticket from "@/models/helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function POST(req) {
  await dbConnect();

  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ success:false, msg:"Unauthorized" }, { status:401 });
  let user;
  try { user = verifyJWT(token); } catch { return NextResponse.json({ success:false, msg:"Invalid token" }, { status:403 }); }

  const { ticketId, rating, comment } = await req.json();
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return NextResponse.json({ success:false, msg:"Ticket not found" }, { status:404 });

  // Only allow customer who owns ticket to submit
  if (user.id !== ticket.customerId.toString()) return NextResponse.json({ success:false, msg:"Forbidden" }, { status:403 });

  const csat = await CSAT.create({
    companyId: ticket.companyId,
    ticketId,
    rating,
    comment,
    submittedBy: user.id,
  });

  return NextResponse.json({ success:true, csat });
}
