export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import TicketFeedback from "@/models/helpdesk/TicketFeedback";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();

  // 🔐 auth (agent/admin)
  const token = getTokenFromHeader(req);
  const user = verifyJWT(token);

  const filter = {};
  if (user.role === "agent") {
    filter.agentId = user._id;
  }

  const data = await TicketFeedback.find(filter)
    .populate("ticketId", "subject")
    .populate("agentId", "name")
    .sort({ createdAt: -1 });

  return Response.json({ data });
}
