import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import TicketCategory from "@/models/helpdesk/TicketCategory";
import { sendMail } from "@/lib/notify";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function POST(req) {
  await dbConnect();

  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ success:false, msg:"Unauthorized" }, { status:401 });

  let user;
  try { user = verifyJWT(token); } 
  catch { return NextResponse.json({ success:false, msg:"Invalid token" }, { status:403 }); }

  if (!user || !user.companyId) {
    return NextResponse.json({ success:false, msg:"Unauthorized" }, { status:401 });
  }

  const body = await req.json();

  // Validate category
  const cat = await TicketCategory.findOne({
    name: body.category,
    companyId: user.companyId,
  });

  if (!cat)
    return NextResponse.json({ success:false, msg:"Invalid category" }, { status:400 });

  const ticket = await Ticket.create({
    companyId: user.companyId,
    customerId: user.id,
    subject: body.subject,
    category: body.category,
    messages: [{ sender: user.id, message: body.message }]
  });
    // Notify support agents via email
    sendMail({
      to: `${process.env.SUPPORT_EMAIL}`,
      subject: `New Support Ticket: ${ticket.subject}`,
      text: `A new support ticket has been created by ${user.name}.\n\nSubject: ${ticket.subject}\n\nPlease log in to the helpdesk to view and respond to the ticket.`,
    });

  return NextResponse.json({ success: true, ticket });
}
