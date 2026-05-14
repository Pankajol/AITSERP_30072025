export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import TicketFeedback from "@/models/helpdesk/TicketFeedback";
import Ticket from "@/models/helpdesk/Ticket";
import CompanyUser from "@/models/CompanyUser";
import Customer from "@/models/CustomerModel";
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
    { _id: 1, agentId: 1, customerId: 1 }   // ⭐ customerId add
  ).lean();

  const ticketMap = new Map();
  const customerTicketMap = new Map();
  const ticketIds = [];

  for (const t of tickets) {
    ticketIds.push(t._id);

    if (t.agentId) {
      ticketMap.set(String(t._id), t.agentId);
    }

    if (t.customerId) {
      customerTicketMap.set(String(t._id), t.customerId);
    }
  }

  /* ================= STEP 2: feedback ================= */

  const filter = {
    ticketId: { $in: ticketIds },
  };

  if (user.role === "agent") {
    filter.$or = [
      { agentId: user._id },
      { agentId: null },
    ];
  }

  let feedbacks = await TicketFeedback.find(filter)
  .populate({
    path: "ticketId",
    select: "subject status customerId agentId",
    populate: [
      {
        path: "customerId",
        select: "customerName email",
      },
      {
        path: "agentId",
        select: "name email",
      },
    ],
  })
  .populate("agentId", "name email")
  .sort({ createdAt: -1 })
  .lean();

  /* ================= STEP 3: FALLBACK CUSTOMER ================= */

  const customerIds = feedbacks
    .filter(fb => !fb.customerId && fb.ticketId?._id)
    .map(fb => customerTicketMap.get(String(fb.ticketId._id)))
    .filter(Boolean);

  const customers = await CompanyUser.find(
    { _id: { $in: customerIds } },
    { customerName: 1, email: 1 }
  ).lean();

  const customerMap = new Map(
    customers.map(c => [String(c._id), c])
  );

  feedbacks = feedbacks.map(fb => {
    if (!fb.customerId && fb.ticketId?._id) {
      const cid = customerTicketMap.get(String(fb.ticketId._id));
      if (cid) {
        fb.customerFromTicket =
          customerMap.get(String(cid)) || null;
      }
    }
    return fb;
  });

  /* ================= STEP 4: FALLBACK AGENT ================= */

  const fallbackAgentIds = feedbacks
    .filter(fb => !fb.agentId && fb.ticketId?._id)
    .map(fb => ticketMap.get(String(fb.ticketId._id)))
    .filter(Boolean);

  const fallbackAgents = await CompanyUser.find(
    { _id: { $in: fallbackAgentIds } },
    { name: 1, email: 1 }
  ).lean();

  const agentMap = new Map(
    fallbackAgents.map(a => [String(a._id), a])
  );

  feedbacks = feedbacks.map(fb => {
    if (!fb.agentId && fb.ticketId?._id) {
      const agentId = ticketMap.get(String(fb.ticketId._id));
      if (agentId) {
        fb.agentFromTicket =
          agentMap.get(String(agentId)) || null;
      }
    }
    return fb;
  });

  /* ================= RESPONSE ================= */

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
// import CompanyUser from "@/models/CompanyUser";


// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// export async function GET(req) {
//   await dbConnect();

//   const token = getTokenFromHeader(req);
//   if (!token) {
//     return Response.json({ msg: "Unauthorized" }, { status: 401 });
//   }

//   const user = verifyJWT(token);

//   /* ================= STEP 1: company tickets ================= */

//   const tickets = await Ticket.find(
//     { companyId: user.companyId },
//     { _id: 1, agentId: 1 }
//   ).lean();

//   const ticketMap = new Map();
//   const ticketIds = [];

//   for (const t of tickets) {
//     ticketIds.push(t._id);
//     if (t.agentId) {
//       ticketMap.set(String(t._id), t.agentId);
//     }
//   }

//   /* ================= STEP 2: feedback ================= */

//   const filter = {
//     ticketId: { $in: ticketIds },
//   };

//   if (user.role === "agent") {
//     filter.$or = [
//       { agentId: user._id },
//       { agentId: null }, // email feedback
//     ];
//   }

//   let feedbacks = await TicketFeedback.find(filter)
//     .populate("ticketId", "subject status")
//     .populate("agentId", "name email")

//     .sort({ createdAt: -1 })
//     .lean();

//   /* ================= STEP 3: FALLBACK CUSTOMER ================= */
// const customerIds = feedbacks
//   .filter(fb => !fb.customerId && fb.ticketId?.customerId)
//   .map(fb => String(fb.ticketId.customerId));
// const customers = await CompanyUser.find(
//   { _id: { $in: customerIds } },
//   { customerName: 1}
// ).lean();
// const customerMap = new Map(customers.map(c => [String(c._id), c])) ;
// feedbacks = feedbacks.map(fb => {
//   if (!fb.customerId && fb.ticketId?.customerId) {
//     fb.customerFromTicket = customerMap.get(String(fb.ticketId.customerId)) || null;
//   }
//   return fb;
// });



// /* ================= STEP 3: FALLBACK AGENT ================= */

// // collect missing agent ids
// const fallbackAgentIds = feedbacks
//   .filter(fb => !fb.agentId && fb.ticketId?._id)
//   .map(fb => ticketMap.get(String(fb.ticketId._id)))
//   .filter(Boolean);

// // load agents
// const fallbackAgents = await CompanyUser.find(
//   { _id: { $in: fallbackAgentIds } },
//   { name: 1, email: 1 }
// ).lean();

// const agentMap = new Map(
//   fallbackAgents.map(a => [String(a._id), a])
// );

// // attach populated agent
// feedbacks = feedbacks.map(fb => {
//   if (!fb.agentId && fb.ticketId?._id) {
//     const agentId = ticketMap.get(String(fb.ticketId._id));
//     if (agentId) {
//       fb.agentFromTicket = agentMap.get(String(agentId)) || null;
//     }
//   }
//   return fb;
// });


//   return Response.json({
//     success: true,
//     count: feedbacks.length,
//     data: feedbacks,
//   });
// }


