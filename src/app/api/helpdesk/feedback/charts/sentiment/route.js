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

  /* ================= STEP 2: MATCH ================= */

  const match = {
    ticketId: { $in: ticketIds },
    "sentiment.label": { $in: ["positive", "neutral", "negative"] },
  };

  if (user.role === "agent") {
    match.$or = [
      { agentId: user._id },        // web feedback
      { agentId: null },            // email feedback
    ];
  }

  /* ================= STEP 3: AGGREGATION ================= */

  let data = await TicketFeedback.aggregate([
    { $match: match },

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

    // agent filter for agent role
    ...(user.role === "agent"
      ? [
          {
            $match: {
              $or: [
                { agentId: user._id },
                {
                  agentId: null,
                  "ticket.agentId": user._id,
                },
              ],
            },
          },
        ]
      : []),

    // group sentiment
    {
      $group: {
        _id: "$sentiment.label",
        count: { $sum: 1 },
      },
    },
  ]);

  /* ================= NORMALIZE RESPONSE ================= */

  const result = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };

  for (const row of data) {
    if (row._id && result[row._id] !== undefined) {
      result[row._id] = row.count;
    }
  }

  return Response.json({
    success: true,
    data: result,
  });
}



// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import TicketFeedback from "@/models/helpdesk/TicketFeedback";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// export async function GET(req) {
//   await dbConnect();

//   const token = getTokenFromHeader(req);
//   const user = verifyJWT(token);

//   const match = {};
//   if (user.role === "agent") {
//     match.agentId = user._id;
//   }

//   const data = await TicketFeedback.aggregate([
//     { $match: match },
//     {
//       $group: {
//         _id: "$sentiment.label",
//         count: { $sum: 1 },
//       },
//     },
//   ]);

//   return Response.json({ data });
// }
