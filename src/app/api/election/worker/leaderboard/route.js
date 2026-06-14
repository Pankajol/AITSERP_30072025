// app/api/election/worker/leaderboard/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

export async function GET(req) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user) {
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
    }

    // Check permission for "Workers" module with "view" action
    if (!hasPermission(user, "Workers", "view")) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const companyId = new mongoose.Types.ObjectId(user.companyId);
    const matchStage = { companyId, isWorker: true };

    // Full access for company admins or specific roles
    const fullAccessRoles = ["Election Admin", "Election Manager", "Election Analyst"];
    const isFullAccess = user.type === "company" || user.roles?.some(r => fullAccessRoles.includes(r));

    if (!isFullAccess) {
      const me = await CompanyUser.findOne({ _id: user.id, companyId })
        .select("assignedConstituency assignedBlock assignedWard assignedBooths");
      
      if (!me) {
        return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
      }

      const conditions = [];
      if (me.assignedWard) conditions.push({ assignedWard: me.assignedWard });
      if (me.assignedBlock) conditions.push({ assignedBlock: me.assignedBlock });
      if (me.assignedBooths?.length) conditions.push({ assignedBooths: { $in: me.assignedBooths } });
      if (me.assignedConstituency) conditions.push({ assignedConstituency: me.assignedConstituency });

      if (conditions.length) {
        matchStage.$or = conditions;
      } else {
        // No assigned area → only see themselves
        matchStage._id = user.id;
      }
    }

    const workers = await CompanyUser.aggregate([
      { $match: matchStage },
      { $unwind: { path: "$workerReports", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$workerReports.activities", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          workerRole: { $first: "$workerRole" },
          totalContacts: { $sum: { $ifNull: ["$workerReports.activities.votersContacted", 0] } },
          totalSurveys: { $sum: { $ifNull: ["$workerReports.activities.newSurveys", 0] } },
        }
      },
      { $sort: { totalContacts: -1 } },
      { $limit: 20 }
    ]);

    return NextResponse.json({ success: true, data: workers });
  } catch (error) {
    console.error("Leaderboard API error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// // app/api/election/worker/leaderboard/route.js
// import { NextResponse } from "next/server";
// import mongoose from "mongoose";
// import dbConnect from "@/lib/db";
// import CompanyUser from "@/models/CompanyUser";
// import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

// // Roles with full access (see all workers in company)
// const FULL_ACCESS_ROLES = ["Election Admin", "Election Manager", "Election Analyst"];

// export async function GET(req) {
//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) {
//       return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
//     }

//     // Verify token – if verifyJWT is async, use await; if sync, remove await.
//     const user = await verifyJWT(token);
//     if (!user) {
//       return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
//     }

//     // Check permission for "Workers" module – 'view' permission required
//     if (!hasPermission(user, "Workers", "view")) {
//       return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
//     }

//     await dbConnect();

//     const companyId = new mongoose.Types.ObjectId(user.companyId);
//     const matchStage = { companyId, isWorker: true };

//     const userRoles = user.roles || [];
//     const isFullAccess = userRoles.some(r => FULL_ACCESS_ROLES.includes(r));

//     // Restrict to assigned area if not full access
//     if (!isFullAccess) {
//       const me = await CompanyUser.findOne({ _id: user.id, companyId })
//         .select("assignedConstituency assignedBlock assignedWard assignedBooths");

//       if (!me) {
//         return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
//       }

//       const scopeConditions = [];
//       if (me.assignedWard) scopeConditions.push({ assignedWard: me.assignedWard });
//       if (me.assignedBlock) scopeConditions.push({ assignedBlock: me.assignedBlock });
//       if (me.assignedBooths?.length > 0) scopeConditions.push({ assignedBooths: { $in: me.assignedBooths } });
//       if (me.assignedConstituency) scopeConditions.push({ assignedConstituency: me.assignedConstituency });

//       if (scopeConditions.length > 0) {
//         matchStage.$or = scopeConditions;
//       } else {
//         // No assignment: only see themselves
//         matchStage._id = new mongoose.Types.ObjectId(user.id);
//       }
//     }

//     // Aggregation pipeline – handle workers with no reports
//     const workers = await CompanyUser.aggregate([
//       { $match: matchStage },
//       {
//         $lookup: {
//           from: "constituencies",
//           localField: "assignedConstituency",
//           foreignField: "_id",
//           as: "constituencyInfo"
//         }
//       },
//       { $unwind: { path: "$constituencyInfo", preserveNullAndEmptyArrays: true } },
//       { $unwind: { path: "$workerReports", preserveNullAndEmptyArrays: true } },
//       { $unwind: { path: "$workerReports.activities", preserveNullAndEmptyArrays: true } },
//       {
//         $group: {
//           _id: "$_id",
//           name: { $first: "$name" },
//           workerRole: { $first: "$workerRole" },
//           assignedConstituency: { $first: "$constituencyInfo.name" },
//           totalContacts: { $sum: { $ifNull: ["$workerReports.activities.votersContacted", 0] } },
//           totalSurveys: { $sum: { $ifNull: ["$workerReports.activities.newSurveys", 0] } },
//         }
//       },
//       { $sort: { totalContacts: -1 } },
//       { $limit: 20 }
//     ]);

//     return NextResponse.json({ success: true, data: workers });
//   } catch (err) {
//     console.error("Leaderboard API error:", err);
//     return NextResponse.json(
//       { success: false, message: err.message || "Internal server error" },
//       { status: 500 }
//     );
//   }
// }