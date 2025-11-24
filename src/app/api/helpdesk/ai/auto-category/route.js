import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import TicketCategory from "@/models/helpdesk/TicketCategory";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const GEN_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_KEY}`;
async function callAI(prompt){
  const res = await fetch(GEN_URL, { method:"POST", body: JSON.stringify({ contents:[{parts:[{text:prompt}]}] }), headers:{ "Content-Type":"application/json" }});
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function POST(req) {
  await dbConnect();
  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ success:false }, { status:401 });
  let user;
  try { user = verifyJWT(token); } catch { return NextResponse.json({ success:false }, { status:403 }); }

  const { ticketId } = await req.json();
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return NextResponse.json({ success:false, msg:"Not found" }, { status:404 });

  const text = ticket.messages.map(m => m.message).join("\n");
  const prompt = `Suggest the best single category name (one of this company's categories) for the following support text. Output only the category name:\n\n${text}`;

  const category = (await callAI(prompt)).trim().toLowerCase();
  // Validate against company categories
  const cat = await TicketCategory.findOne({ companyId: ticket.companyId, name: new RegExp(`^${category}$`, "i") });
  const final = cat ? cat.name : "general";

  ticket.category = final;
  await ticket.save();

  return NextResponse.json({ success:true, category: final });
}
