export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import TicketFeedback from "@/models/helpdesk/TicketFeedback";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  try {
    await dbConnect();

    /* ---------- AUTH ---------- */
    const token = getTokenFromHeader(req);
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyJWT(token);
    if (!user || !user.companyId) {
      return Response.json({ error: "Invalid user" }, { status: 403 });
    }

    /* ---------- COMPANY WISE FILTER ---------- */
    const filter = {
      companyId: user.companyId, // 🔥 MAIN FIX
    };

    // agent should see only own feedback
    if (user.role === "agent") {
      filter.agentId = user._id;
    }

    /* ---------- FETCH FEEDBACK ---------- */
    const data = await TicketFeedback.find(filter)
      .populate("ticketId", "subject")
      .populate("agentId", "name avatar")
      .sort({ createdAt: -1 });

    return Response.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("❌ Fetch feedback error:", err);
    return Response.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}



// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import TicketFeedback from "@/models/helpdesk/TicketFeedback";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// export async function GET(req) {
//   await dbConnect();

//   // 🔐 auth (agent/admin)
//   const token = getTokenFromHeader(req);
//   const user = verifyJWT(token);

//   const filter = {};
//   if (user.role === "agent") {
//     filter.agentId = user._id;
//   }

//   const data = await TicketFeedback.find(filter)
//     .populate("ticketId", "subject")
//     .populate("agentId", "name")
//     .sort({ createdAt: -1 });

//   return Response.json({ data });
// }
