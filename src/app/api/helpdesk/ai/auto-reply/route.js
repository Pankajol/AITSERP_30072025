import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Ticket from "@/models//helpdesk/Ticket";

const GEN_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_KEY}`;

async function callAI(prompt) {
  const res = await fetch(GEN_URL, {
    method: "POST",
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    headers: { "Content-Type": "application/json" }
  });
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function POST(req){
  await dbConnect();
  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ success:false }, { status:401 });
  let user;
  try { user = verifyJWT(token); } catch { return NextResponse.json({ success:false }, { status:403 }); }

  const { ticketId } = await req.json();
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return NextResponse.json({ success:false, msg:"Not found" }, { status:404 });

  // Build context: last customer message
  const lastMsg = [...ticket.messages].reverse().find(m => m.sender.toString() === ticket.customerId.toString());
  const context = lastMsg ? lastMsg.message : ticket.messages.map(m => m.message).join("\n");

  const prompt = `You are a professional support agent for a SaaS product. Create a concise, polite, helpful reply to this customer message:\n\n"${context}"\n\nKeep it under 5 sentences, ask clarifying question if necessary, give next steps.`;
  const reply = await callAI(prompt);

  return NextResponse.json({ success:true, reply });
}
