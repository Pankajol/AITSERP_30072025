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

  const [stats] = await TicketFeedback.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        avgRating: { $avg: "$rating" },
        positive: {
          $sum: { $cond: [{ $eq: ["$sentiment", "positive"] }, 1, 0] },
        },
        neutral: {
          $sum: { $cond: [{ $eq: ["$sentiment", "neutral"] }, 1, 0] },
        },
        negative: {
          $sum: { $cond: [{ $eq: ["$sentiment", "negative"] }, 1, 0] },
        },
      },
    },
  ]);

  return Response.json({
    total: stats?.total || 0,
    avgRating: Number(stats?.avgRating || 0).toFixed(2),
    sentiment: {
      positive: stats?.positive || 0,
      neutral: stats?.neutral || 0,
      negative: stats?.negative || 0,
    },
  });
}
