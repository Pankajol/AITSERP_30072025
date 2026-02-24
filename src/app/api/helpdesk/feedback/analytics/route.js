export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import TicketFeedback from "@/models/helpdesk/TicketFeedback";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    const user = verifyJWT(token);

    if (!user) {
      return NextResponse.json({ msg: "Unauthorized" }, { status: 401 });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    /* ================= PIPELINE ================= */

    const pipeline = [
  /* ================= JOIN TICKET ================= */
  {
    $lookup: {
      from: "tickets",
      localField: "ticketId",
      foreignField: "_id",
      as: "ticket",
    },
  },
  { $unwind: "$ticket" },

  /* ================= ROLE FILTER ================= */

  // ADMIN → company filter from ticket
  ...(user.role === "admin"
    ? [{ $match: { "ticket.companyId": user.companyId } }]
    : []),

  // AGENT → ticket.agentId filter
  ...(user.role === "agent"
    ? [{ $match: { "ticket.agentId": user._id } }]
    : []),

  /* ================= FACET ================= */
  {
    $facet: {
      /* ===== LIST ===== */
      feedbackList: [
        { $sort: { createdAt: -1 } },
        { $limit: 100 },

        // ⭐ AGENT FROM TICKET
        {
          $lookup: {
            from: "companyusers",
            localField: "ticket.agentId",
            foreignField: "_id",
            as: "agent",
          },
        },

        // ⭐ CUSTOMER FROM TICKET
        {
          $lookup: {
            from: "customers",
            localField: "ticket.customerId",
            foreignField: "_id",
            as: "customer",
          },
        },

        {
          $project: {
            rating: 1,
            comment: 1,
            sentiment: 1,
            createdAt: 1,
            "ticket.subject": 1,
            agent: { $arrayElemAt: ["$agent", 0] },
            customer: { $arrayElemAt: ["$customer", 0] },
          },
        },
      ],

      /* ===== OVERVIEW ===== */
      overview: [
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            avgRating: { $avg: "$rating" },
            positive: {
              $sum: {
                $cond: [{ $eq: ["$sentiment.label", "positive"] }, 1, 0],
              },
            },
            neutral: {
              $sum: {
                $cond: [{ $eq: ["$sentiment.label", "neutral"] }, 1, 0],
              },
            },
            negative: {
              $sum: {
                $cond: [{ $eq: ["$sentiment.label", "negative"] }, 1, 0],
              },
            },
          },
        },
      ],

      /* ===== RATING ===== */
      ratingDistribution: [
        {
          $group: {
            _id: "$rating",
            total: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ],

      /* ===== MONTHLY ===== */
      monthlyTrend: [
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            total: { $sum: 1 },
            avgRating: { $avg: "$rating" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ],
    },
  },
];

    const [result] = await TicketFeedback.aggregate(pipeline);

    const overview = result?.overview?.[0] || {};

    const csat =
      overview.total > 0
        ? ((overview.positive || 0) / overview.total) * 100
        : 0;

    return NextResponse.json({
      success: true,
      overview: {
        total: overview.total || 0,
        avgRating: Number(overview.avgRating || 0).toFixed(2),
        csat: csat.toFixed(1) + "%",
        sentiment: {
          positive: overview.positive || 0,
          neutral: overview.neutral || 0,
          negative: overview.negative || 0,
        },
      },
      ratingDistribution: result.ratingDistribution || [],
      monthlyTrend: result.monthlyTrend || [],
      last7Days: result.last7Days?.[0]?.count || 0,
      feedbackList: result.feedbackList || [],
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    return NextResponse.json(
      { success: false, msg: error.message },
      { status: 500 }
    );
  }
}