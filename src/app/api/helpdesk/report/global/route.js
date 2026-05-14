import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Customer from "@/models/CustomerModel";
import CompanyUser from "@/models/CompanyUser";
import { verifyJWT, getTokenFromHeader } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    const decoded = await verifyJWT(token);

    // 🛡️ Admin/Company Security Check
    if (decoded.type !== "company" && !decoded.roles?.includes("admin")) {
      return NextResponse.json({ message: "Access Denied" }, { status: 403 });
    }

    // 🔥 V.IMPORTANT: Ye companyId ensure karega ki dusri company ka data na dikhe
    const companyId = new mongoose.Types.ObjectId(decoded.companyId);

    const [statusStats, priorityStats, agentPerformance, customerHeatmap] = await Promise.all([
      // 1. Status Stats (Company Specific)
      Ticket.aggregate([
        { $match: { companyId } }, 
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),

      // 2. Priority Stats (Company Specific)
      Ticket.aggregate([
        { $match: { companyId } },
        { $group: { _id: "$priority", count: { $sum: 1 } } }
      ]),

      // 3. Agent Leaderboard (Advanced Isolation)
      Ticket.aggregate([
        { 
          $match: { 
            companyId: companyId, 
            status: { $regex: /^closed$/i } 
          } 
        },
        { $group: { _id: "$agentId", closedCount: { $sum: 1 } } },
        { $match: { _id: { $ne: null } } },
        { $sort: { closedCount: -1 } },
        { $limit: 5 },
        { 
          $lookup: { 
            from: "companyusers", 
            let: { agent_id: "$_id" },
            pipeline: [
              { $match: { 
                  $expr: { 
                    $and: [
                      { $eq: ["$_id", "$$agent_id"] },
                      { $eq: ["$companyId", companyId] } // 🔥 Lookup ke andar bhi isolation
                    ]
                  } 
              } }
            ],
            as: "agentDetails" 
          } 
        },
        { $unwind: { path: "$agentDetails", preserveNullAndEmptyArrays: false } } // False: Taaki bina company match wala gayab ho jaye
      ]),

      // 4. Customer Heatmap (Advanced Isolation)
      Ticket.aggregate([
        { $match: { companyId: companyId } },
        { $group: { _id: "$customerId", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { 
          $lookup: { 
            from: "customers", 
            let: { cust_id: "$_id" },
            pipeline: [
              { $match: { 
                  $expr: { 
                    $and: [
                      { $eq: ["$_id", "$$cust_id"] },
                      { $eq: ["$companyId", companyId] } // 🔥 Isolation
                    ]
                  } 
              } }
            ],
            as: "cust" 
          } 
        },
        { $unwind: { path: "$cust", preserveNullAndEmptyArrays: false } }
      ])
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalTickets: await Ticket.countDocuments({ companyId }),
        totalCustomers: await Customer.countDocuments({ companyId }),
        totalAgents: await CompanyUser.countDocuments({ companyId, roles: "Agent" }),
        statusStats,
        priorityStats,
        agentPerformance,
        customerHeatmap
      }
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import Customer from "@/models/CustomerModel";
// import CompanyUser from "@/models/CompanyUser";
// import { verifyJWT, getTokenFromHeader } from "@/lib/auth";
// import mongoose from "mongoose";

// export async function GET(req) {
//   try {
//     await dbConnect();
//     const token = getTokenFromHeader(req);
//     const decoded = await verifyJWT(token);

//     if (decoded.type !== "company" && !decoded.roles?.includes("admin")) {
//       return NextResponse.json({ message: "Access Denied" }, { status: 403 });
//     }

//     const companyId = new mongoose.Types.ObjectId(decoded.companyId);

//     const [statusStats, priorityStats, agentPerformance, customerHeatmap] = await Promise.all([
//       // 1. Status Stats
//       Ticket.aggregate([
//         { $match: { companyId } },
//         { $group: { _id: "$status", count: { $sum: 1 } } }
//       ]),
//       // 2. Priority Stats
//       Ticket.aggregate([
//         { $match: { companyId } },
//         { $group: { _id: "$priority", count: { $sum: 1 } } }
//       ]),
//       // 3. 🔥 AGENT LEADERBOARD (FIXED)
//       Ticket.aggregate([
//         { 
//           $match: { 
//             companyId, 
//             status: { $regex: /^closed$/i } // ✅ Case-insensitive: Closed/closed dono chalega
//           } 
//         },
//         { $group: { _id: "$agentId", closedCount: { $sum: 1 } } },
//         { $match: { _id: { $ne: null } } }, // ✅ Sirf valid agents ka data
//         { $sort: { closedCount: -1 } },
//         { $limit: 5 },
//         { 
//           $lookup: { 
//             from: "companyusers", // ⚠️ Collection name must be plural lowercase in MongoDB
//             localField: "_id", 
//             foreignField: "_id", 
//             as: "agentDetails" 
//           } 
//         },
//         { $unwind: { path: "$agentDetails", preserveNullAndEmptyArrays: true } }
//       ]),
//       // 4. Customer Volume
//       Ticket.aggregate([
//         { $match: { companyId } },
//         { $group: { _id: "$customerId", count: { $sum: 1 } } },
//         { $sort: { count: -1 } },
//         { $limit: 5 },
//         { 
//           $lookup: { 
//             from: "customers", 
//             localField: "_id", 
//             foreignField: "_id", 
//             as: "cust" 
//           } 
//         },
//         { $unwind: { path: "$cust", preserveNullAndEmptyArrays: true } }
//       ])
//     ]);

//     return NextResponse.json({
//       success: true,
//       data: {
//         totalTickets: await Ticket.countDocuments({ companyId }),
//         totalCustomers: await Customer.countDocuments({ companyId }),
//         totalAgents: await CompanyUser.countDocuments({ companyId, roles: { $regex: /^agent$/i } }),
//         statusStats,
//         priorityStats,
//         agentPerformance, // ✅ Now contains 'agentDetails'
//         customerHeatmap
//       }
//     });
//   } catch (err) {
//     return NextResponse.json({ success: false, error: err.message }, { status: 500 });
//   }
// }


// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import Customer from "@/models/CustomerModel";
// import CompanyUser from "@/models/CompanyUser";
// import { verifyJWT, getTokenFromHeader } from "@/lib/auth";
// import mongoose from "mongoose";

// // ... baaki imports same rahenge

// export async function GET(req) {
//   try {
//     await dbConnect();
//     const token = getTokenFromHeader(req);
//     const decoded = await verifyJWT(token);

//     if (decoded.type !== "company" && !decoded.roles?.includes("admin")) {
//       return NextResponse.json({ message: "Access Denied" }, { status: 403 });
//     }

//     const companyId = new mongoose.Types.ObjectId(decoded.companyId);

//     const [statusStats, priorityStats, agentPerformance, customerHeatmap] = await Promise.all([
//       Ticket.aggregate([
//         { $match: { companyId } },
//         { $group: { _id: "$status", count: { $sum: 1 } } }
//       ]),
//       Ticket.aggregate([
//         { $match: { companyId } },
//         { $group: { _id: "$priority", count: { $sum: 1 } } }
//       ]),
//       Ticket.aggregate([
//         { $match: { companyId, status: "Closed" } },
//         { $group: { _id: "$agentId", closedCount: { $sum: 1 } } },
//         { $sort: { closedCount: -1 } },
//         { $limit: 5 },
//         { 
//           $lookup: { 
//             from: "companyusers", // 🔥 Confirm: Agar model name CompanyUser hai toh ye plural lowercase hona chahiye
//             localField: "_id", 
//             foreignField: "_id", 
//             as: "Agent" 
//           } 
//         },
//         { $unwind: { path: "$Agent", preserveNullAndEmptyArrays: true } } // 🔥 Safe unwind
//       ]),
//       Ticket.aggregate([
//         { $match: { companyId } },
//         { $group: { _id: "$customerId", count: { $sum: 1 } } },
//         { $sort: { count: -1 } },
//         { $limit: 5 },
//         { 
//           $lookup: { 
//             from: "customers", // 🔥 Confirm: 'customers' collection name
//             localField: "_id", 
//             foreignField: "_id", 
//             as: "cust" 
//           } 
//         },
//         { $unwind: { path: "$cust", preserveNullAndEmptyArrays: true } }
//       ])
//     ]);

//     return NextResponse.json({
//       success: true,
//       data: {
//         totalTickets: await Ticket.countDocuments({ companyId }),
//         totalCustomers: await Customer.countDocuments({ companyId }),
//         totalAgents: await CompanyUser.countDocuments({ companyId, roles: "Agent" }),
//         statusStats,
//         priorityStats,
//         agentPerformance,
//         customerHeatmap
//       }
//     });
//   } catch (err) {
//     return NextResponse.json({ success: false, error: err.message }, { status: 500 });
//   }
// }