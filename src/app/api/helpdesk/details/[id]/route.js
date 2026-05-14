import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req, context) {
  await dbConnect();

  // ✅ Await params (IMPORTANT FIX)
  const { id } = await context.params;

  const token = getTokenFromHeader(req);
  if (!token) {
    return NextResponse.json(
      { success: false, msg: "Unauthorized" },
      { status: 401 }
    );
  }

  let user;
  try {
    user = verifyJWT(token);
  } catch {
    return NextResponse.json(
      { success: false, msg: "Invalid token" },
      { status: 403 }
    );
  }

  const ticket = await Ticket.findById(id)
    .populate("customerId", "name email")
    .populate("agentId", "name email")
    .populate("messages.sender", "name email roles");

  if (!ticket)
    return NextResponse.json(
      { success: false, msg: "Ticket not found" },
      { status: 404 }
    );

  const canView =
    user.roles?.includes("admin") ||
    ticket.customerId?._id?.toString() === user.id ||
    ticket.agentId?._id?.toString() === user.id;

  if (!canView)
    return NextResponse.json(
      { success: false, msg: "Forbidden" },
      { status: 403 }
    );

  return NextResponse.json({ success: true, ticket });
}
