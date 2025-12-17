export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import TicketFeedback from "@/models/helpdesk/TicketFeedback";

export async function GET() {
  await dbConnect();

  const data = await TicketFeedback.find()
    .populate("ticketId", "subject")
    .populate("agentId", "name email")
    .sort({ createdAt: -1 });

  return Response.json({ data });
}
