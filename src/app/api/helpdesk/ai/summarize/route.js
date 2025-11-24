import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

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

export async function POST(req) {
  await dbConnect();
  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ success:false }, { status:401 });
  let user;
  try { user = verifyJWT(token); } catch { return NextResponse.json({ success:false }, { status:403 }); }

  const { ticketId } = await req.json();
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return NextResponse.json({ success:false, msg:"Not found" }, { status:404 });
  // only permitted viewers
  if (!(user.roles?.includes("admin") || ticket.customerId.toString() === user.id || ticket.agentId?.toString() === user.id))
    return NextResponse.json({ success:false, msg:"Forbidden" }, { status:403 });

  const text = ticket.messages.map(m => `${m.message}`).join("\n\n");
  const prompt = `Summarize this support conversation into a short concise summary with key points, steps taken, and current state:\n\n${text}`;

  const summary = await callAI(prompt);
  ticket.summary = summary;
  await ticket.save();

  return NextResponse.json({ success:true, summary });
}
