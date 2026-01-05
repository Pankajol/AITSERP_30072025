export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import TicketFeedback from "@/models/helpdesk/TicketFeedback";
import Ticket from "@/models/helpdesk/Ticket";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();

  const token = getTokenFromHeader(req);
  if (!token) {
    return Response.json({ msg: "Unauthorized" }, { status: 401 });
  }

  const user = verifyJWT(token);

  /* ================= STEP 1: company tickets ================= */

  const tickets = await Ticket.find(
    { companyId: user.companyId },
    { _id: 1, agentId: 1 }
  ).lean();

  const ticketMap = new Map();
  const ticketIds = [];

  for (const t of tickets) {
    ticketIds.push(t._id);
    if (t.agentId) {
      ticketMap.set(String(t._id), t.agentId);
    }
  }

  /* ================= STEP 2: feedback ================= */

  const filter = {
    ticketId: { $in: ticketIds },
  };

  if (user.role === "agent") {
    filter.$or = [
      { agentId: user._id },
      { agentId: null }, // email feedback
    ];
  }

  let feedbacks = await TicketFeedback.find(filter)
    .populate("ticketId", "subject status")
    .populate("agentId", "name email")
    .sort({ createdAt: -1 })
    .lean();

  /* ================= STEP 3: FALLBACK AGENT ================= */

/* ================= STEP 3: FALLBACK AGENT ================= */

// collect missing agent ids
const fallbackAgentIds = feedbacks
  .filter(fb => !fb.agentId && fb.ticketId?._id)
  .map(fb => ticketMap.get(String(fb.ticketId._id)))
  .filter(Boolean);

// load agents
const fallbackAgents = await CompanyUser.find(
  { _id: { $in: fallbackAgentIds } },
  { name: 1, email: 1 }
).lean();

const agentMap = new Map(
  fallbackAgents.map(a => [String(a._id), a])
);

// attach populated agent
feedbacks = feedbacks.map(fb => {
  if (!fb.agentId && fb.ticketId?._id) {
    const agentId = ticketMap.get(String(fb.ticketId._id));
    if (agentId) {
      fb.agentFromTicket = agentMap.get(String(agentId)) || null;
    }
  }
  return fb;
});


  return Response.json({
    success: true,
    count: feedbacks.length,
    data: feedbacks,
  });
}



// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import TicketFeedback from "@/models/helpdesk/TicketFeedback";
// import Ticket from "@/models/helpdesk/Ticket";
// import CompanyUser from "@/models/CompanyUser"; // ✅ ADD THIS LINE
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// export async function GET(req) {
//   await dbConnect();

//   const token = getTokenFromHeader(req);
//   if (!token) {
//     return Response.json({ msg: "Unauthorized" }, { status: 401 });
//   }

//   const user = verifyJWT(token);

//   /* ================= STEP 1: get company tickets ================= */

//   const tickets = await Ticket.find(
//     { companyId: user.companyId },
//     { _id: 1 }
//   ).lean();

//   const ticketIds = tickets.map(t => t._id);

//   /* ================= STEP 2: filter ================= */

//   const filter = {
//     ticketId: { $in: ticketIds },
//   };

//   if (user.role === "agent") {
//     filter.agentId = user._id;
//   }

//   /* ================= STEP 3: query ================= */

//   const data = await TicketFeedback.find(filter)
//     .populate("ticketId", "subject status priority")
//     .populate("agentId", "name email") // now works ✅
//     .sort({ createdAt: -1 });

//   return Response.json({
//     success: true,
//     count: data.length,
//     data,
//   });
// }
