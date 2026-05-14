import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import SLA from "@/models/helpdesk/SLA";

export async function POST(req) {
  await dbConnect();

  // This endpoint can be called by a cron job (server-side) to mark SLA status.
  const { ticketId } = await req.json();
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return NextResponse.json({ success:false, msg:"Ticket not found" }, { status:404 });

  const sla = await SLA.findOne({ companyId: ticket.companyId, priority: ticket.priority }) || 
              await SLA.findOne({ companyId: ticket.companyId });

  if (!sla) return NextResponse.json({ success:true, msg:"No SLA configured" });

  const created = ticket.createdAt;
  const now = new Date();

  const elapsedHours = (now - created) / (1000*60*60);

  // check response (first message from agent)
  const firstAgentMsg = ticket.messages.find(m => m.sender.toString() !== ticket.customerId.toString());
  let firstAgentResponseHours = firstAgentMsg ? (new Date(firstAgentMsg.createdAt) - created)/(1000*60*60) : null;

  const responseBreach = firstAgentMsg ? firstAgentResponseHours > sla.responseHours : elapsedHours > sla.responseHours;
  const resolutionElapsedHours = ticket.status === "closed" && ticket.updatedAt ? (ticket.updatedAt - created)/(1000*60*60) : null;
  const resolutionBreach = resolutionElapsedHours ? resolutionElapsedHours > sla.resolutionHours : false;

  return NextResponse.json({
    success: true,
    sla,
    responseBreach,
    resolutionBreach,
    firstAgentResponseHours,
    elapsedHours
  });
}
