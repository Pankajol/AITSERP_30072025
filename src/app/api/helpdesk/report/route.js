import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });

    const decoded = await verifyJWT(token);
    const agentId = new mongoose.Types.ObjectId(decoded.id);

    // Insight: 24 hours SLA check
    const slaLimit = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [statusStats, priorityStats, tatStats, recentTickets, slaBreaches] = await Promise.all([
      // Status Distribution
      Ticket.aggregate([
        { $match: { agentId } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      // Priority Distribution
      Ticket.aggregate([
        { $match: { agentId } },
        { $group: { _id: "$priority", count: { $sum: 1 } } }
      ]),
      // TAT Calculation (Avg Hours to Close)
      Ticket.aggregate([
        { $match: { agentId, status: "Closed", createdAt: { $exists: true }, updatedAt: { $exists: true } } },
        { $project: { duration: { $divide: [{ $subtract: ["$updatedAt", "$createdAt"] }, 3600000] } } },
        { $group: { _id: null, avgTAT: { $avg: "$duration" }, total: { $sum: 1 } } }
      ]),
      // Ticket List
      Ticket.find({ agentId }).sort({ updatedAt: -1 }).limit(10).populate("customerId", "customerName"),
      // SLA Breaches (Open tickets > 24h)
      Ticket.countDocuments({ agentId, status: { $ne: "Closed" }, createdAt: { $lt: slaLimit } })
    ]);

    const totalAssigned = await Ticket.countDocuments({ agentId });
    const totalClosed = tatStats[0]?.total || 0;

    return NextResponse.json({
      success: true,
      data: {
        statusStats,
        priorityStats,
        totalAssigned,
        totalClosed,
        slaBreaches,
        avgTat: tatStats[0]?.avgTAT.toFixed(1) || 0,
        efficiency: totalAssigned > 0 ? Math.round((totalClosed / totalAssigned) * 100) : 0,
        recentTickets
      }
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import mongoose from "mongoose"; // 🔥 Yeh missing ho sakta hai

// export async function GET(req) {
//   try {
//     await dbConnect();

//     // 1. Auth Validation
//     const token = getTokenFromHeader(req);
//     if (!token) return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });

//     let user;
//     try {
//       user = await verifyJWT(token);
//     } catch (err) {
//       return NextResponse.json({ success: false, msg: "Invalid Token" }, { status: 403 });
//     }

//     // 2. Filter: Sirf usi agent ka data dikhao
//     // Agar user Admin hai toh filter hata sakte hain, par Agent dashboard ke liye zaroori hai
//     const agentId = new mongoose.Types.ObjectId(user.id);

//     // 3. Status Distribution Aggregation
//     const statusStats = await Ticket.aggregate([
//       { $match: { agentId: agentId } },
//       { $group: { _id: "$status", count: { $sum: 1 } } }
//     ]);

//     // 4. Priority Distribution Aggregation
//     const priorityStats = await Ticket.aggregate([
//       { $match: { agentId: agentId } },
//       { $group: { _id: "$priority", count: { $sum: 1 } } }
//     ]);

//     // 5. Total counts calculate karein
//     const totalAssigned = await Ticket.countDocuments({ agentId });
//     const totalClosed = await Ticket.countDocuments({ agentId, status: "Closed" });

//     // Response structure standard rakhein
//     return NextResponse.json({
//       success: true,
//       data: {
//         statusStats,
//         priorityStats,
//         totalAssigned,
//         totalClosed,
//         efficiency: totalAssigned > 0 ? Math.round((totalClosed / totalAssigned) * 100) : 0
//       }
//     });

//   } catch (err) {
//     console.error("❌ Report API Error:", err);
//     return NextResponse.json({ 
//       success: false, 
//       message: "Analytics Engine Error", 
//       error: err.message 
//     }, { status: 500 });
//   }
// }