import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function POST(req) {
  await dbConnect();
  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ success:false }, { status:401 });
  let user;
  try { user = verifyJWT(token);} catch{ return NextResponse.json({ success:false }, { status:403 }); }

  const { ticketId } = await req.json();
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return NextResponse.json({ success:false, msg:"Not found" }, { status:404 });

  // naive similarity: search same category or keyword match
  const keywords = ticket.subject.split(/\s+/).slice(0,6).map(k => new RegExp(k, 'i'));
  const similar = await Ticket.find({
    _id: { $ne: ticket._id },
    companyId: ticket.companyId,
    $or: [
      { subject: { $in: keywords } },
      { category: ticket.category }
    ]
  }).limit(10);

  return NextResponse.json({ success:true, similar });
}
