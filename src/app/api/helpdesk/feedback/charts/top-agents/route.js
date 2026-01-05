export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import TicketFeedback from "@/models/helpdesk/TicketFeedback";
import Ticket from "@/models/helpdesk/Ticket";
import CompanyUser from "@/models/CompanyUser";
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

  /* ================= STEP 2: AGGREGATION ================= */

  const data = await TicketFeedback.aggregate([
    {
      $match: {
        ticketId: { $in: ticketIds },
        rating: { $gt: 0 },
      },
    },

    // join ticket to resolve agent fallback
    {
      $lookup: {
        from: "tickets",
        localField: "ticketId",
        foreignField: "_id",
        as: "ticket",
      },
    },
    { $unwind: "$ticket" },

    // normalize agentId (feedback.agentId || ticket.agentId)
    {
      $addFields: {
        effectiveAgentId: {
          $ifNull: ["$agentId", "$ticket.agentId"],
        },
      },
    },

    // group by effective agent
    {
      $group: {
        _id: "$effectiveAgentId",
        avgRating: { $avg: "$rating" },
        totalFeedback: { $sum: 1 },
      },
    },

    // remove still-null agents
    {
      $match: {
        _id: { $ne: null },
      },
    },

    { $sort: { avgRating: -1 } },
    { $limit: 10 },

    // join agent details
    {
      $lookup: {
        from: "companyusers",
        localField: "_id",
        foreignField: "_id",
        as: "agent",
      },
    },
    { $unwind: "$agent" },

    // shape response
    {
      $project: {
        _id: 0,
        agentId: "$agent._id",
        agentName: "$agent.name",
        agentEmail: "$agent.email",
        avgRating: { $round: ["$avgRating", 2] },
        totalFeedback: 1,
      },
    },
  ]);

  return Response.json({
    success: true,
    data,
  });
}
