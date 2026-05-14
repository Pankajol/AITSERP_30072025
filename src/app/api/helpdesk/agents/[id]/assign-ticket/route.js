// src/app/api/helpdesk/agents/[id]/assign-ticket/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import mongoose from "mongoose";
import Ticket from "@/models/helpdesk/Ticket";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

/* SLA Rules */
const SLA_HOURS = {
  low: 48,
  medium: 24,
  high: 8,
  critical: 1,
};

function isAuthorized(auth) {
  if (!auth) return false;
  const roles = (auth.roles || []).map(r => String(r).toLowerCase());
  return (
    roles.includes("admin") ||
    roles.includes("agent") ||
    roles.includes("employee")
  );
}

export async function POST(req, { params }) {
  await dbConnect();

  const token = getTokenFromHeader(req);
  if (!token)
    return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });

  let auth;
  try {
    auth = verifyJWT(token);
  } catch {
    return NextResponse.json({ success: false, msg: "Invalid token" }, { status: 403 });
  }

  if (!isAuthorized(auth))
    return NextResponse.json({ success: false, msg: "No permission" }, { status: 403 });

  try {
    const agentId = params.id;
    const body = await req.json();
    const { ticketId, priority = "medium" } = body;

    if (!ticketId)
      return NextResponse.json({ success: false, msg: "ticketId required" }, { status: 400 });

    const companyId = auth.companyId;

    // Validate agent
    const agent = await CompanyUser.findOne({ _id: agentId, companyId });
    if (!agent)
      return NextResponse.json({ success: false, msg: "Agent not found" }, { status: 404 });

    // Validate ticket
    const ticket = await Ticket.findOne({ _id: ticketId, companyId });
    if (!ticket)
      return NextResponse.json({ success: false, msg: "Ticket not found" }, { status: 404 });

    // SLA due date
    const hours = SLA_HOURS[priority.toLowerCase()] ?? SLA_HOURS.medium;
    const dueDate = new Date(Date.now() + hours * 60 * 60 * 1000);

    ticket.agentId = agentId;
    ticket.priority = priority;
    ticket.status = "assigned";
    ticket.slaDue = dueDate;

    await ticket.save();

    return NextResponse.json({
      success: true,
      msg: "Ticket assigned",
      ticket,
    });
  } catch (err) {
    console.error("assign-ticket:", err);
    return NextResponse.json({ success: false, msg: err.message }, { status: 500 });
  }
}
