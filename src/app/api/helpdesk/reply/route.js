import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function POST(req) {
  await dbConnect();

  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ success:false, msg:"Unauthorized" }, { status:401 });

  let user;
  try { user = verifyJWT(token); } 
  catch { return NextResponse.json({ success:false, msg:"Invalid token" }, { status:403 }); }

  const { ticketId, message } = await req.json();
  const ticket = await Ticket.findById(ticketId);

  if (!ticket) return NextResponse.json({ success:false, msg:"Not found" }, { status:404 });

  const canReply =
    user.roles?.includes("admin") ||
    ticket.customerId.toString() === user.id ||
    ticket.agentId?.toString() === user.id;

  if (!canReply)
    return NextResponse.json({ success:false, msg:"Forbidden" }, { status:403 });

  ticket.messages.push({
    sender: user.id,
    message,
  });

  await ticket.save();

  return NextResponse.json({ success: true });
}
