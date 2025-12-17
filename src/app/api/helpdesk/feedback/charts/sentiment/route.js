export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import TicketFeedback from "@/models/helpdesk/TicketFeedback";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();

  const token = getTokenFromHeader(req);
  const user = verifyJWT(token);

  const match = {};
  if (user.role === "agent") {
    match.agentId = user._id;
  }

  const data = await TicketFeedback.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$sentiment.label",
        count: { $sum: 1 },
      },
    },
  ]);

  return Response.json({ data });
}
