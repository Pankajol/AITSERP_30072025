export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import TicketFeedback from "@/models/helpdesk/TicketFeedback";
import Ticket from "@/models/helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();

  /* ================= AUTH ================= */

  const token = getTokenFromHeader(req);
  if (!token) {
    return Response.json({ msg: "Unauthorized" }, { status: 401 });
  }

  const user = verifyJWT(token);

  /* ================= STEP 1: COMPANY TICKETS ================= */

  const tickets = await Ticket.find(
    { companyId: user.companyId },
    { _id: 1, agentId: 1 }
  ).lean();

  const ticketIds = tickets.map(t => t._id);

  /* ================= STEP 2: BASE MATCH ================= */

  const match = {
    ticketId: { $in: ticketIds },
    rating: { $gt: 0 }, // ignore invalid ratings
  };

  /* ================= STEP 3: AGGREGATION ================= */

  const pipeline = [
    { $match: match },

    // join ticket for agent fallback
    {
      $lookup: {
        from: "tickets",
        localField: "ticketId",
        foreignField: "_id",
        as: "ticket",
      },
    },
    { $unwind: "$ticket" },
  ];

  // agent-specific filtering
  if (user.role === "agent") {
    pipeline.push({
      $match: {
        $or: [
          { agentId: user._id },                 // web feedback
          { agentId: null, "ticket.agentId": user._id }, // email feedback
        ],
      },
    });
  }

  // group by month
  pipeline.push(
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.month": 1,
      },
    }
  );

  const data = await TicketFeedback.aggregate(pipeline);

  return Response.json({
    success: true,
    data,
  });
}
