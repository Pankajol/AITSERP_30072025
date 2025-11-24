import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import CompanyUser from "@/models/CompanyUser";
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

  if (!user.roles?.includes("admin")) return NextResponse.json({ success:false, msg:"Admin only" }, { status:403 });

  const { ticketId } = await req.json();
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return NextResponse.json({ success:false, msg:"Not found" }, { status:404 });

  // fetch agents
  const agents = await CompanyUser.find({ companyId: ticket.companyId, roles: { $in: ["agent"] } });

  if (!agents.length) return NextResponse.json({ success:false, msg:"No agents" });

  // Build prompt with ticket summary and agents list -> ask AI to pick agent email or name
  const agentsList = agents.map(a => `${a._id} | ${a.name} | ${a.email}`).join("\n");
  const prompt = `Given this ticket subject and text, choose the most appropriate agent from the list below. Output only the selected agent id (exact match). Ticket:\nSubject: ${ticket.subject}\nText: ${ticket.messages.map(m=>m.message).join("\n")}\n\nAgents:\n${agentsList}`;

  const aiOut = (await callAI(prompt)).trim();
  // try to parse agent id from output
  const chosen = agents.find(a => aiOut.includes(a._id.toString()) || aiOut.includes(a.email) || aiOut.includes(a.name));
  const selectedAgent = chosen ? chosen._id : agents[0]._id;

  ticket.agentId = selectedAgent;
  await ticket.save();

  return NextResponse.json({ success:true, agentId: selectedAgent.toString() });
}
