import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ticket from "@/models//helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const GEN_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_KEY}`;
async function callAI(prompt){ /* same as above */ 
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

  // provide summary + suggested replies
  const conversation = ticket.messages.map(m => `${m.message}`).join("\n\n");
  const prompt = `Read the following support conversation and give 3 suggested replies an agent could send (short bullet points). Conversation:\n\n${conversation}`;
  const suggestion = await callAI(prompt);

  return NextResponse.json({ success:true, suggestion });
}
