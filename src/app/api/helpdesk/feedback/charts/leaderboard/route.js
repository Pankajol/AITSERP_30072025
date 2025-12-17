export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import TicketFeedback from "@/models/helpdesk/TicketFeedback";

export async function GET() {
  await dbConnect();

  const data = await TicketFeedback.aggregate([
    {
      $group: {
        _id: "$agentId",
        avgRating: { $avg: "$rating" },
        totalFeedback: { $sum: 1 },
      },
    },
    { $sort: { avgRating: -1 } },
    { $limit: 10 },
  ]);

  return Response.json({ data });
}
