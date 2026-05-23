// app/api/election/dashboard/analytics/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Voter from "@/models/election/Voter";
import Booth from "@/models/election/Booth";
import Constituency from "@/models/election/Constituency";
import ElectionExpense from "@/models/election/ElectionExpense";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

async function getUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  const user = await verifyJWT(token);
  if (!user) return { error: "Invalid token", status: 401 };
  return { user };
}

export async function GET(req) {
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  // Check permission for Election Analytics module (view)
  if (!hasPermission(user, "Election Analytics", "view")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  await dbConnect();
  
  // companyId ko properly handle karo (string ya ObjectId)
  const companyIdValue = user.companyId;
  let companyObjectId;
  try {
    companyObjectId = new mongoose.Types.ObjectId(companyIdValue);
  } catch {
    companyObjectId = companyIdValue;
  }

  const { searchParams } = new URL(req.url);
  const constituencyId = searchParams.get("constituencyId");
  const boothId = searchParams.get("boothId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const supportLevel = searchParams.get("supportLevel");

  // Date filter (if valid dates provided)
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  // Convert IDs to ObjectId if valid
  const constIdObj = (constituencyId && mongoose.Types.ObjectId.isValid(constituencyId)) 
    ? new mongoose.Types.ObjectId(constituencyId) : null;
  const boothIdObj = (boothId && mongoose.Types.ObjectId.isValid(boothId)) 
    ? new mongoose.Types.ObjectId(boothId) : null;

  // Base match for Voter (respects all filters)
  const voterMatch = {
    companyId: companyObjectId,
    ...(constIdObj && { constituencyId: constIdObj }),
    ...(boothIdObj && { booth: boothIdObj }),
    ...(supportLevel && { supportLevel }),
    ...(hasDateFilter && { createdAt: dateFilter })
  };

  // Remove undefined keys
  Object.keys(voterMatch).forEach(key => voterMatch[key] === undefined && delete voterMatch[key]);

  try {
    // ---- 1. Overall Support Distribution ----
    const supportDistribution = await Voter.aggregate([
      { $match: voterMatch },
      { $group: { _id: "$supportLevel", count: { $sum: 1 } } }
    ]);

    // ---- 2. Top 10 Booths (by totalVoters) ----
    const boothMatch = {
      companyId: companyObjectId,
      ...(constIdObj && { constituencyId: constIdObj }),
      ...(boothIdObj && { _id: boothIdObj })
    };
    Object.keys(boothMatch).forEach(key => boothMatch[key] === undefined && delete boothMatch[key]);

    const boothWiseVoters = await Booth.aggregate([
      { $match: boothMatch },
      { $project: { boothNumber: 1, name: 1, totalVoters: 1 } },
      { $sort: { totalVoters: -1 } },
      { $limit: 10 }
    ]);

    // ---- 3. Voter Registration Trend (monthly) ----
    const voterTrend = await Voter.aggregate([
      { $match: voterMatch },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // ---- 4. Expense by Category ----
    const expenseMatch = {
      companyId: companyObjectId,
      ...(hasDateFilter && { createdAt: dateFilter }),
      ...(boothIdObj && { booth: boothIdObj })
    };
    if (constIdObj && !boothIdObj) {
      const expenseByCategory = await ElectionExpense.aggregate([
        { $match: expenseMatch },
        {
          $lookup: {
            from: "booths",
            localField: "booth",
            foreignField: "_id",
            as: "boothInfo"
          }
        },
        { $unwind: { path: "$boothInfo", preserveNullAndEmptyArrays: true } },
        { $match: { "boothInfo.constituencyId": constIdObj } },
        { $group: { _id: "$category", total: { $sum: "$amount" } } }
      ]);
      var expenseByCategoryResult = expenseByCategory;
    } else {
      expenseByCategoryResult = await ElectionExpense.aggregate([
        { $match: expenseMatch },
        { $group: { _id: "$category", total: { $sum: "$amount" } } }
      ]);
    }
    const expenseByCategory = expenseByCategoryResult || [];

    // ---- 5. Worker Activities (global) ----
    const workerMatch = { companyId: companyObjectId, isWorker: true };
    let workerPipeline = [
      { $match: workerMatch },
      { $unwind: { path: "$workerReports", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$workerReports.activities", preserveNullAndEmptyArrays: true } }
    ];
    if (hasDateFilter) {
      workerPipeline.push({ $match: { "workerReports.activities.date": dateFilter } });
    }
    if (boothIdObj) {
      workerPipeline.push({ $match: { "workerReports.booth": boothIdObj } });
    } else if (constIdObj) {
      workerPipeline.push(
        { $lookup: { from: "booths", localField: "workerReports.booth", foreignField: "_id", as: "boothInfo" } },
        { $unwind: "$boothInfo" },
        { $match: { "boothInfo.constituencyId": constIdObj } }
      );
    }
    workerPipeline.push(
      {
        $group: {
          _id: { id: "$_id", name: "$name", role: "$workerRole" },
          totalContacts: { $sum: { $ifNull: ["$workerReports.activities.votersContacted", 0] } },
          totalSurveys: { $sum: { $ifNull: ["$workerReports.activities.newSurveys", 0] } }
        }
      },
      {
        $project: {
          _id: 0, id: "$_id.id", name: "$_id.name", workerRole: "$_id.role",
          totalContacts: 1, totalSurveys: 1
        }
      },
      { $sort: { totalContacts: -1 } },
      { $limit: 10 }
    );
    const workerActivities = await CompanyUser.aggregate(workerPipeline);

    // ---- 6. Election Type Distribution (no filters) ----
    const electionTypeDistribution = await Constituency.aggregate([
      { $match: { companyId: companyObjectId } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // ---- 7. Constituency-wise Voters (respects date & support) ----
    const constituencyVoterMatch = {
      companyId: companyObjectId,
      ...(supportLevel && { supportLevel }),
      ...(hasDateFilter && { createdAt: dateFilter })
    };
    const constituencyWiseVoters = await Voter.aggregate([
      { $match: constituencyVoterMatch },
      {
        $lookup: {
          from: "constituencies",
          localField: "constituencyId",
          foreignField: "_id",
          as: "constituency"
        }
      },
      { $unwind: { path: "$constituency", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { id: "$constituency._id", name: "$constituency.name", type: "$constituency.type" },
          totalVoters: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0, constituencyId: "$_id.id", constituencyName: "$_id.name",
          constituencyType: "$_id.type", totalVoters: 1
        }
      },
      { $sort: { totalVoters: -1 } }
    ]);

    // ---- 8. Constituency-wise Expenses ----
    const constituencyExpenseMatch = {
      companyId: companyObjectId,
      ...(hasDateFilter && { createdAt: dateFilter })
    };
    const constituencyWiseExpenses = await ElectionExpense.aggregate([
      { $match: constituencyExpenseMatch },
      {
        $lookup: {
          from: "constituencies",
          localField: "constituencyId",
          foreignField: "_id",
          as: "constituency"
        }
      },
      { $unwind: "$constituency" },
      {
        $group: {
          _id: { id: "$constituency._id", name: "$constituency.name" },
          totalExpense: { $sum: "$amount" }
        }
      },
      {
        $project: {
          _id: 0, constituencyId: "$_id.id", constituencyName: "$_id.name", totalExpense: 1
        }
      },
      { $sort: { totalExpense: -1 } }
    ]);

    // ---- 9. Constituency Support Table ----
    const constituencySupport = await Voter.aggregate([
      { $match: constituencyVoterMatch },
      {
        $lookup: {
          from: "constituencies",
          localField: "constituencyId",
          foreignField: "_id",
          as: "constituency"
        }
      },
      { $unwind: { path: "$constituency", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { constituencyName: "$constituency.name", supportLevel: "$supportLevel" },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.constituencyName",
          supports: { $push: { level: "$_id.supportLevel", count: "$count" } }
        }
      },
      { $limit: 10 }
    ]);

    // ---- 10. Booth-wise Voters (Full) ----
    const boothFullMatch = {
      companyId: companyObjectId,
      ...(constIdObj && { constituencyId: constIdObj }),
      ...(boothIdObj && { _id: boothIdObj })
    };
    Object.keys(boothFullMatch).forEach(key => boothFullMatch[key] === undefined && delete boothFullMatch[key]);
    const boothWiseVotersFull = await Booth.aggregate([
      { $match: boothFullMatch },
      { $project: { boothNumber: 1, name: 1, totalVoters: 1, constituencyId: 1 } },
      { $sort: { totalVoters: -1 } }
    ]);

    // ---- 11. Booth-wise Expenses ----
    let boothExpensesMatch = { companyId: companyObjectId };
    if (hasDateFilter) boothExpensesMatch.createdAt = dateFilter;
    let boothExpensesPipeline = [{ $match: boothExpensesMatch }];
    if (boothIdObj) {
      boothExpensesPipeline.push({ $match: { booth: boothIdObj } });
    } else if (constIdObj) {
      boothExpensesPipeline.push(
        { $lookup: { from: "booths", localField: "booth", foreignField: "_id", as: "boothInfo" } },
        { $unwind: "$boothInfo" },
        { $match: { "boothInfo.constituencyId": constIdObj } }
      );
    } else {
      boothExpensesPipeline.push(
        { $lookup: { from: "booths", localField: "booth", foreignField: "_id", as: "boothInfo" } },
        { $unwind: "$boothInfo" }
      );
    }
    boothExpensesPipeline.push(
      {
        $group: {
          _id: { id: "$boothInfo._id", number: "$boothInfo.boothNumber", name: "$boothInfo.name" },
          totalExpense: { $sum: "$amount" }
        }
      },
      {
        $project: {
          _id: 0, boothId: "$_id.id", boothNumber: "$_id.number", boothName: "$_id.name", totalExpense: 1
        }
      },
      { $sort: { totalExpense: -1 } }
    );
    const boothWiseExpenses = await ElectionExpense.aggregate(boothExpensesPipeline);

    // ---- 12. Booth Support Distribution ----
    let boothSupportMatch = { companyId: companyObjectId };
    if (hasDateFilter) boothSupportMatch.createdAt = dateFilter;
    if (supportLevel) boothSupportMatch.supportLevel = supportLevel;
    let boothSupportPipeline = [{ $match: boothSupportMatch }];
    if (boothIdObj) {
      boothSupportPipeline.push({ $match: { booth: boothIdObj } });
    } else if (constIdObj) {
      boothSupportPipeline.push(
        { $lookup: { from: "booths", localField: "booth", foreignField: "_id", as: "boothInfo" } },
        { $unwind: "$boothInfo" },
        { $match: { "boothInfo.constituencyId": constIdObj } }
      );
    } else {
      boothSupportPipeline.push(
        { $lookup: { from: "booths", localField: "booth", foreignField: "_id", as: "boothInfo" } },
        { $unwind: "$boothInfo" }
      );
    }
    boothSupportPipeline.push(
      {
        $group: {
          _id: { boothNumber: "$boothInfo.boothNumber", supportLevel: "$supportLevel" },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.boothNumber",
          supports: { $push: { level: "$_id.supportLevel", count: "$count" } }
        }
      },
      { $limit: 20 }
    );
    const boothSupport = await Voter.aggregate(boothSupportPipeline);

    // ---- 13. Worker Activity by Booth ----
    let workerBoothPipeline = [
      { $match: { companyId: companyObjectId, isWorker: true } },
      { $unwind: "$workerReports" },
      { $unwind: "$workerReports.activities" }
    ];
    if (hasDateFilter) {
      workerBoothPipeline.push({
        $match: { "workerReports.activities.date": dateFilter }
      });
    }
    if (boothIdObj) {
      workerBoothPipeline.push({ $match: { "workerReports.booth": boothIdObj } });
    } else if (constIdObj) {
      workerBoothPipeline.push(
        { $lookup: { from: "booths", localField: "workerReports.booth", foreignField: "_id", as: "boothInfo" } },
        { $unwind: "$boothInfo" },
        { $match: { "boothInfo.constituencyId": constIdObj } }
      );
    } else {
      workerBoothPipeline.push(
        { $lookup: { from: "booths", localField: "workerReports.booth", foreignField: "_id", as: "boothInfo" } },
        { $unwind: { path: "$boothInfo", preserveNullAndEmptyArrays: true } }
      );
    }
    workerBoothPipeline.push(
      {
        $group: {
          _id: { boothNumber: { $ifNull: ["$boothInfo.boothNumber", "Unassigned"] }, workerName: "$name" },
          totalContacts: { $sum: { $ifNull: ["$workerReports.activities.votersContacted", 0] } },
          totalSurveys: { $sum: { $ifNull: ["$workerReports.activities.newSurveys", 0] } }
        }
      },
      {
        $group: {
          _id: "$_id.boothNumber",
          workers: {
            $push: { name: "$_id.workerName", contacts: "$totalContacts", surveys: "$totalSurveys" }
          },
          totalContacts: { $sum: "$totalContacts" },
          totalSurveys: { $sum: "$totalSurveys" }
        }
      },
      { $sort: { totalContacts: -1 } },
      { $limit: 10 }
    );
    const workerActivityByBooth = await CompanyUser.aggregate(workerBoothPipeline);

    return NextResponse.json({
      success: true,
      data: {
        supportDistribution,
        boothWiseVoters,
        voterTrend,
        expenseByCategory,
        workerActivities,
        electionTypeDistribution,
        constituencyWiseVoters,
        constituencyWiseExpenses,
        constituencySupport,
        boothWiseVotersFull,
        boothWiseExpenses,
        boothSupport,
        workerActivityByBooth
      }
    });
  } catch (err) {
    console.error("Analytics aggregation error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}



// // app/api/election/dashboard/analytics/route.js
// import { NextResponse } from "next/server";
// import mongoose from "mongoose";
// import dbConnect from "@/lib/db";
// import Voter from "@/models/election/Voter";
// import Booth from "@/models/election/Booth";
// import Constituency from "@/models/election/Constituency";
// import ElectionExpense from "@/models/election/ElectionExpense";
// import CompanyUser from "@/models/CompanyUser";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// function isAuthorized(user) {
//   if (!user) return false;
//   if (user.type === "company") return true;
//   const allowedRoles = ["admin", "election manager"];
//   const userRoles = Array.isArray(user.roles) ? user.roles : [];
//   return userRoles.some((role) => allowedRoles.includes(role.trim().toLowerCase()));
// }

// async function validateUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Token missing", status: 401 };
//   try {
//     const user = await verifyJWT(token);
//     if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
//     return { user };
//   } catch {
//     return { error: "Invalid token", status: 401 };
//   }
// }

// export async function GET(req) {
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   await dbConnect();
  
//   // companyId ko properly handle karo (string ya ObjectId)
//   const companyIdValue = user.companyId;
//   let companyObjectId;
//   try {
//     companyObjectId = new mongoose.Types.ObjectId(companyIdValue);
//   } catch {
//     companyObjectId = companyIdValue;
//   }

//   const { searchParams } = new URL(req.url);
//   const constituencyId = searchParams.get("constituencyId");
//   const boothId = searchParams.get("boothId");
//   const startDate = searchParams.get("startDate");
//   const endDate = searchParams.get("endDate");
//   const supportLevel = searchParams.get("supportLevel");

//   // Date filter (if valid dates provided)
//   const dateFilter = {};
//   if (startDate) dateFilter.$gte = new Date(startDate);
//   if (endDate) dateFilter.$lte = new Date(endDate);
//   const hasDateFilter = Object.keys(dateFilter).length > 0;

//   // Convert IDs to ObjectId if valid
//   const constIdObj = (constituencyId && mongoose.Types.ObjectId.isValid(constituencyId)) 
//     ? new mongoose.Types.ObjectId(constituencyId) : null;
//   const boothIdObj = (boothId && mongoose.Types.ObjectId.isValid(boothId)) 
//     ? new mongoose.Types.ObjectId(boothId) : null;

//   // Base match for Voter (respects all filters)
//   const voterMatch = {
//     companyId: companyObjectId,
//     ...(constIdObj && { constituencyId: constIdObj }),
//     ...(boothIdObj && { booth: boothIdObj }),
//     ...(supportLevel && { supportLevel }),
//     ...(hasDateFilter && { createdAt: dateFilter })
//   };

//   // Remove undefined keys
//   Object.keys(voterMatch).forEach(key => voterMatch[key] === undefined && delete voterMatch[key]);

//   try {
//     // ---- 1. Overall Support Distribution ----
//     const supportDistribution = await Voter.aggregate([
//       { $match: voterMatch },
//       { $group: { _id: "$supportLevel", count: { $sum: 1 } } }
//     ]);

//     // ---- 2. Top 10 Booths (by totalVoters) ----
//     const boothMatch = {
//       companyId: companyObjectId,
//       ...(constIdObj && { constituencyId: constIdObj }),
//       ...(boothIdObj && { _id: boothIdObj })
//     };
//     Object.keys(boothMatch).forEach(key => boothMatch[key] === undefined && delete boothMatch[key]);

//     const boothWiseVoters = await Booth.aggregate([
//       { $match: boothMatch },
//       { $project: { boothNumber: 1, name: 1, totalVoters: 1 } },
//       { $sort: { totalVoters: -1 } },
//       { $limit: 10 }
//     ]);

//     // ---- 3. Voter Registration Trend (monthly) ----
//     const voterTrend = await Voter.aggregate([
//       { $match: voterMatch },
//       {
//         $group: {
//           _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
//           count: { $sum: 1 }
//         }
//       },
//       { $sort: { _id: 1 } }
//     ]);

//     // ---- 4. Expense by Category ----
//     const expenseMatch = {
//       companyId: companyObjectId,
//       ...(hasDateFilter && { createdAt: dateFilter }),
//       ...(boothIdObj && { booth: boothIdObj })
//     };
//     if (constIdObj && !boothIdObj) {
//       // Join with Booth to filter by constituency
//       const expenseByCategory = await ElectionExpense.aggregate([
//         { $match: expenseMatch },
//         {
//           $lookup: {
//             from: "booths",
//             localField: "booth",
//             foreignField: "_id",
//             as: "boothInfo"
//           }
//         },
//         { $unwind: { path: "$boothInfo", preserveNullAndEmptyArrays: true } },
//         { $match: { "boothInfo.constituencyId": constIdObj } },
//         { $group: { _id: "$category", total: { $sum: "$amount" } } }
//       ]);
//       var expenseByCategoryResult = expenseByCategory;
//     } else {
//       expenseByCategoryResult = await ElectionExpense.aggregate([
//         { $match: expenseMatch },
//         { $group: { _id: "$category", total: { $sum: "$amount" } } }
//       ]);
//     }
//     const expenseByCategory = expenseByCategoryResult || [];

//     // ---- 5. Worker Activities (global) ----
//     const workerMatch = { companyId: companyObjectId, isWorker: true };
//     let workerPipeline = [
//       { $match: workerMatch },
//       { $unwind: { path: "$workerReports", preserveNullAndEmptyArrays: true } },
//       { $unwind: { path: "$workerReports.activities", preserveNullAndEmptyArrays: true } }
//     ];
//     if (hasDateFilter) {
//       workerPipeline.push({ $match: { "workerReports.activities.date": dateFilter } });
//     }
//     if (boothIdObj) {
//       workerPipeline.push({ $match: { "workerReports.booth": boothIdObj } });
//     } else if (constIdObj) {
//       workerPipeline.push(
//         { $lookup: { from: "booths", localField: "workerReports.booth", foreignField: "_id", as: "boothInfo" } },
//         { $unwind: "$boothInfo" },
//         { $match: { "boothInfo.constituencyId": constIdObj } }
//       );
//     }
//     workerPipeline.push(
//       {
//         $group: {
//           _id: { id: "$_id", name: "$name", role: "$workerRole" },
//           totalContacts: { $sum: { $ifNull: ["$workerReports.activities.votersContacted", 0] } },
//           totalSurveys: { $sum: { $ifNull: ["$workerReports.activities.newSurveys", 0] } }
//         }
//       },
//       {
//         $project: {
//           _id: 0, id: "$_id.id", name: "$_id.name", workerRole: "$_id.role",
//           totalContacts: 1, totalSurveys: 1
//         }
//       },
//       { $sort: { totalContacts: -1 } },
//       { $limit: 10 }
//     );
//     const workerActivities = await CompanyUser.aggregate(workerPipeline);

//     // ---- 6. Election Type Distribution (no filters) ----
//     const electionTypeDistribution = await Constituency.aggregate([
//       { $match: { companyId: companyObjectId } },
//       { $group: { _id: "$type", count: { $sum: 1 } } },
//       { $sort: { count: -1 } }
//     ]);

//     // ---- 7. Constituency-wise Voters (respects date & support, ignores constituency filter because it's grouping by constituency) ----
//     const constituencyVoterMatch = {
//       companyId: companyObjectId,
//       ...(supportLevel && { supportLevel }),
//       ...(hasDateFilter && { createdAt: dateFilter })
//     };
//     const constituencyWiseVoters = await Voter.aggregate([
//       { $match: constituencyVoterMatch },
//       {
//         $lookup: {
//           from: "constituencies",
//           localField: "constituencyId",
//           foreignField: "_id",
//           as: "constituency"
//         }
//       },
//       { $unwind: { path: "$constituency", preserveNullAndEmptyArrays: true } },
//       {
//         $group: {
//           _id: { id: "$constituency._id", name: "$constituency.name", type: "$constituency.type" },
//           totalVoters: { $sum: 1 }
//         }
//       },
//       {
//         $project: {
//           _id: 0, constituencyId: "$_id.id", constituencyName: "$_id.name",
//           constituencyType: "$_id.type", totalVoters: 1
//         }
//       },
//       { $sort: { totalVoters: -1 } }
//     ]);

//     // ---- 8. Constituency-wise Expenses ----
//     const constituencyExpenseMatch = {
//       companyId: companyObjectId,
//       ...(hasDateFilter && { createdAt: dateFilter })
//     };
//     const constituencyWiseExpenses = await ElectionExpense.aggregate([
//       { $match: constituencyExpenseMatch },
//       {
//         $lookup: {
//           from: "constituencies",
//           localField: "constituencyId",
//           foreignField: "_id",
//           as: "constituency"
//         }
//       },
//       { $unwind: "$constituency" },
//       {
//         $group: {
//           _id: { id: "$constituency._id", name: "$constituency.name" },
//           totalExpense: { $sum: "$amount" }
//         }
//       },
//       {
//         $project: {
//           _id: 0, constituencyId: "$_id.id", constituencyName: "$_id.name", totalExpense: 1
//         }
//       },
//       { $sort: { totalExpense: -1 } }
//     ]);

//     // ---- 9. Constituency Support Table ----
//     const constituencySupport = await Voter.aggregate([
//       { $match: constituencyVoterMatch },
//       {
//         $lookup: {
//           from: "constituencies",
//           localField: "constituencyId",
//           foreignField: "_id",
//           as: "constituency"
//         }
//       },
//       { $unwind: { path: "$constituency", preserveNullAndEmptyArrays: true } },
//       {
//         $group: {
//           _id: { constituencyName: "$constituency.name", supportLevel: "$supportLevel" },
//           count: { $sum: 1 }
//         }
//       },
//       {
//         $group: {
//           _id: "$_id.constituencyName",
//           supports: { $push: { level: "$_id.supportLevel", count: "$count" } }
//         }
//       },
//       { $limit: 10 }
//     ]);

//     // ---- 10. Booth-wise Voters (Full) ----
//     const boothFullMatch = {
//       companyId: companyObjectId,
//       ...(constIdObj && { constituencyId: constIdObj }),
//       ...(boothIdObj && { _id: boothIdObj })
//     };
//     Object.keys(boothFullMatch).forEach(key => boothFullMatch[key] === undefined && delete boothFullMatch[key]);
//     const boothWiseVotersFull = await Booth.aggregate([
//       { $match: boothFullMatch },
//       { $project: { boothNumber: 1, name: 1, totalVoters: 1, constituencyId: 1 } },
//       { $sort: { totalVoters: -1 } }
//     ]);

//     // ---- 11. Booth-wise Expenses ----
//     let boothExpensesMatch = { companyId: companyObjectId };
//     if (hasDateFilter) boothExpensesMatch.createdAt = dateFilter;
//     let boothExpensesPipeline = [{ $match: boothExpensesMatch }];
//     if (boothIdObj) {
//       boothExpensesPipeline.push({ $match: { booth: boothIdObj } });
//     } else if (constIdObj) {
//       boothExpensesPipeline.push(
//         { $lookup: { from: "booths", localField: "booth", foreignField: "_id", as: "boothInfo" } },
//         { $unwind: "$boothInfo" },
//         { $match: { "boothInfo.constituencyId": constIdObj } }
//       );
//     } else {
//       boothExpensesPipeline.push(
//         { $lookup: { from: "booths", localField: "booth", foreignField: "_id", as: "boothInfo" } },
//         { $unwind: "$boothInfo" }
//       );
//     }
//     boothExpensesPipeline.push(
//       {
//         $group: {
//           _id: { id: "$boothInfo._id", number: "$boothInfo.boothNumber", name: "$boothInfo.name" },
//           totalExpense: { $sum: "$amount" }
//         }
//       },
//       {
//         $project: {
//           _id: 0, boothId: "$_id.id", boothNumber: "$_id.number", boothName: "$_id.name", totalExpense: 1
//         }
//       },
//       { $sort: { totalExpense: -1 } }
//     );
//     const boothWiseExpenses = await ElectionExpense.aggregate(boothExpensesPipeline);

//     // ---- 12. Booth Support Distribution ----
//     let boothSupportMatch = { companyId: companyObjectId };
//     if (hasDateFilter) boothSupportMatch.createdAt = dateFilter;
//     if (supportLevel) boothSupportMatch.supportLevel = supportLevel;
//     let boothSupportPipeline = [{ $match: boothSupportMatch }];
//     if (boothIdObj) {
//       boothSupportPipeline.push({ $match: { booth: boothIdObj } });
//     } else if (constIdObj) {
//       boothSupportPipeline.push(
//         { $lookup: { from: "booths", localField: "booth", foreignField: "_id", as: "boothInfo" } },
//         { $unwind: "$boothInfo" },
//         { $match: { "boothInfo.constituencyId": constIdObj } }
//       );
//     } else {
//       boothSupportPipeline.push(
//         { $lookup: { from: "booths", localField: "booth", foreignField: "_id", as: "boothInfo" } },
//         { $unwind: "$boothInfo" }
//       );
//     }
//     boothSupportPipeline.push(
//       {
//         $group: {
//           _id: { boothNumber: "$boothInfo.boothNumber", supportLevel: "$supportLevel" },
//           count: { $sum: 1 }
//         }
//       },
//       {
//         $group: {
//           _id: "$_id.boothNumber",
//           supports: { $push: { level: "$_id.supportLevel", count: "$count" } }
//         }
//       },
//       { $limit: 20 }
//     );
//     const boothSupport = await Voter.aggregate(boothSupportPipeline);

//     // ---- 13. Worker Activity by Booth ----
//     let workerBoothPipeline = [
//       { $match: { companyId: companyObjectId, isWorker: true } },
//       { $unwind: "$workerReports" },
//       { $unwind: "$workerReports.activities" }
//     ];
//     if (hasDateFilter) {
//       workerBoothPipeline.push({
//         $match: { "workerReports.activities.date": dateFilter }
//       });
//     }
//     if (boothIdObj) {
//       workerBoothPipeline.push({ $match: { "workerReports.booth": boothIdObj } });
//     } else if (constIdObj) {
//       workerBoothPipeline.push(
//         { $lookup: { from: "booths", localField: "workerReports.booth", foreignField: "_id", as: "boothInfo" } },
//         { $unwind: "$boothInfo" },
//         { $match: { "boothInfo.constituencyId": constIdObj } }
//       );
//     } else {
//       workerBoothPipeline.push(
//         { $lookup: { from: "booths", localField: "workerReports.booth", foreignField: "_id", as: "boothInfo" } },
//         { $unwind: { path: "$boothInfo", preserveNullAndEmptyArrays: true } }
//       );
//     }
//     workerBoothPipeline.push(
//       {
//         $group: {
//           _id: { boothNumber: { $ifNull: ["$boothInfo.boothNumber", "Unassigned"] }, workerName: "$name" },
//           totalContacts: { $sum: { $ifNull: ["$workerReports.activities.votersContacted", 0] } },
//           totalSurveys: { $sum: { $ifNull: ["$workerReports.activities.newSurveys", 0] } }
//         }
//       },
//       {
//         $group: {
//           _id: "$_id.boothNumber",
//           workers: {
//             $push: { name: "$_id.workerName", contacts: "$totalContacts", surveys: "$totalSurveys" }
//           },
//           totalContacts: { $sum: "$totalContacts" },
//           totalSurveys: { $sum: "$totalSurveys" }
//         }
//       },
//       { $sort: { totalContacts: -1 } },
//       { $limit: 10 }
//     );
//     const workerActivityByBooth = await CompanyUser.aggregate(workerBoothPipeline);

//     return NextResponse.json({
//       success: true,
//       data: {
//         supportDistribution,
//         boothWiseVoters,
//         voterTrend,
//         expenseByCategory,
//         workerActivities,
//         electionTypeDistribution,
//         constituencyWiseVoters,
//         constituencyWiseExpenses,
//         constituencySupport,
//         boothWiseVotersFull,
//         boothWiseExpenses,
//         boothSupport,
//         workerActivityByBooth
//       }
//     });
//   } catch (err) {
//     console.error("Analytics aggregation error:", err);
//     return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
//   }
// }

// // app/api/election/dashboard/analytics/route.js
// import { NextResponse } from "next/server";
// import mongoose from "mongoose";
// import dbConnect from "@/lib/db";
// import Voter from "@/models/election/Voter";
// import Booth from "@/models/election/Booth";
// import Constituency from "@/models/election/Constituency";
// import ElectionExpense from "@/models/election/ElectionExpense";
// import CompanyUser from "@/models/CompanyUser";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// function isAuthorized(user) {
//   if (!user) return false;
//   if (user.type === "company") return true;
//   const allowedRoles = ["admin", "election manager"];
//   const userRoles = Array.isArray(user.roles) ? user.roles : [];
//   return userRoles.some((role) => allowedRoles.includes(role.trim().toLowerCase()));
// }

// async function validateUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Token missing", status: 401 };
//   try {
//     const user = await verifyJWT(token);
//     if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
//     return { user };
//   } catch {
//     return { error: "Invalid token", status: 401 };
//   }
// }

// export async function GET(req) {
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   await dbConnect();
//   const companyObjectId = new mongoose.Types.ObjectId(user.companyId);

//   const { searchParams } = new URL(req.url);
//   const constituencyId = searchParams.get("constituencyId");
//   const boothId = searchParams.get("boothId");
//   const startDate = searchParams.get("startDate");
//   const endDate = searchParams.get("endDate");
//   const supportLevel = searchParams.get("supportLevel");

//   // Build dynamic match conditions
//   const voterMatch = { companyId: companyObjectId };
//   const expenseMatch = { companyId: companyObjectId };
//   const dateFilter = {};
//   if (startDate || endDate) {
//     dateFilter.createdAt = {};
//     if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
//     if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
//   }
//   if (Object.keys(dateFilter).length) {
//     voterMatch.createdAt = dateFilter.createdAt;
//     // Expense model uses 'date' field (or fallback to createdAt)
//     expenseMatch.date = dateFilter.createdAt;
//   }
//   if (constituencyId) {
//     voterMatch.constituencyId = new mongoose.Types.ObjectId(constituencyId);
//   }
//   if (boothId) {
//     voterMatch.booth = new mongoose.Types.ObjectId(boothId);
//   }
//   if (supportLevel) {
//     voterMatch.supportLevel = supportLevel;
//   }

//   try {
//     // ---- Overall support distribution ----
//     const supportDistribution = await Voter.aggregate([
//       { $match: voterMatch },
//       { $group: { _id: "$supportLevel", count: { $sum: 1 } } },
//     ]);

//     // ---- Top 10 booths (respect constituency filter) ----
//     let boothMatch = { companyId: companyObjectId };
//     if (constituencyId) boothMatch.constituencyId = new mongoose.Types.ObjectId(constituencyId);
//     const boothWiseVoters = await Booth.aggregate([
//       { $match: boothMatch },
//       { $project: { boothNumber: 1, name: 1, totalVoters: 1 } },
//       { $sort: { totalVoters: -1 } },
//       { $limit: 10 },
//     ]);

//     // ---- Voter registration trend (monthly) ----
//     const voterTrend = await Voter.aggregate([
//       { $match: voterMatch },
//       {
//         $group: {
//           _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
//           count: { $sum: 1 },
//         },
//       },
//       { $sort: { _id: 1 } },
//     ]);

//     // ---- Expense by category (with optional constituency join) ----
//     let expensePipeline = [{ $match: expenseMatch }];
//     if (constituencyId && !boothId) {
//       expensePipeline.push(
//         { $lookup: { from: "booths", localField: "booth", foreignField: "_id", as: "boothInfo" } },
//         { $unwind: { path: "$boothInfo", preserveNullAndEmptyArrays: true } },
//         { $match: { "boothInfo.constituencyId": new mongoose.Types.ObjectId(constituencyId) } }
//       );
//     }
//     if (boothId) {
//       expensePipeline.push({ $match: { booth: new mongoose.Types.ObjectId(boothId) } });
//     }
//     expensePipeline.push({ $group: { _id: "$category", total: { $sum: "$amount" } } });
//     const expenseByCategory = await ElectionExpense.aggregate(expensePipeline);

//     // ---- Worker activity (global) ----
//     let workerActivityPipeline = [
//       { $match: { companyId: companyObjectId, isWorker: true } },
//       { $unwind: { path: "$workerReports", preserveNullAndEmptyArrays: true } },
//       { $unwind: { path: "$workerReports.activities", preserveNullAndEmptyArrays: true } },
//     ];
//     if (startDate || endDate) {
//       workerActivityPipeline.push({
//         $match: {
//           "workerReports.activities.date": {
//             ...(startDate && { $gte: new Date(startDate) }),
//             ...(endDate && { $lte: new Date(endDate) }),
//           },
//         },
//       });
//     }
//     workerActivityPipeline.push(
//       {
//         $group: {
//           _id: { id: "$_id", name: "$name", role: "$workerRole" },
//           totalContacts: { $sum: { $ifNull: ["$workerReports.activities.votersContacted", 0] } },
//           totalSurveys: { $sum: { $ifNull: ["$workerReports.activities.newSurveys", 0] } },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           id: "$_id.id",
//           name: "$_id.name",
//           workerRole: "$_id.role",
//           totalContacts: 1,
//           totalSurveys: 1,
//         },
//       },
//       { $sort: { totalContacts: -1 } },
//       { $limit: 10 }
//     );
//     const workerActivities = await CompanyUser.aggregate(workerActivityPipeline);

//     // ---- Election type distribution (no filters) ----
//     const electionTypeDistribution = await Constituency.aggregate([
//       { $match: { companyId: companyObjectId } },
//       { $group: { _id: "$type", count: { $sum: 1 } } },
//       { $sort: { count: -1 } },
//     ]);

//     // ---- Constituency-wise voters (respects date & support) ----
//     let constituencyVoterMatch = { companyId: companyObjectId };
//     if (startDate || endDate) constituencyVoterMatch.createdAt = dateFilter.createdAt;
//     if (supportLevel) constituencyVoterMatch.supportLevel = supportLevel;
//     const constituencyWiseVoters = await Voter.aggregate([
//       { $match: constituencyVoterMatch },
//       {
//         $lookup: {
//           from: "constituencies",
//           localField: "constituencyId",
//           foreignField: "_id",
//           as: "constituency",
//         },
//       },
//       { $unwind: "$constituency" },
//       {
//         $group: {
//           _id: { id: "$constituency._id", name: "$constituency.name", type: "$constituency.type" },
//           totalVoters: { $sum: 1 },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           constituencyId: "$_id.id",
//           constituencyName: "$_id.name",
//           constituencyType: "$_id.type",
//           totalVoters: 1,
//         },
//       },
//       { $sort: { totalVoters: -1 } },
//     ]);

//     // ---- Constituency-wise expenses ----
//     let constituencyExpenseMatch = { companyId: companyObjectId };
//     if (startDate || endDate) constituencyExpenseMatch.date = dateFilter.createdAt;
//     const constituencyWiseExpenses = await ElectionExpense.aggregate([
//       { $match: constituencyExpenseMatch },
//       {
//         $lookup: {
//           from: "constituencies",
//           localField: "constituencyId",
//           foreignField: "_id",
//           as: "constituency",
//         },
//       },
//       { $unwind: "$constituency" },
//       {
//         $group: {
//           _id: { id: "$constituency._id", name: "$constituency.name" },
//           totalExpense: { $sum: "$amount" },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           constituencyId: "$_id.id",
//           constituencyName: "$_id.name",
//           totalExpense: 1,
//         },
//       },
//       { $sort: { totalExpense: -1 } },
//     ]);

//     // ---- Constituency support table ----
//     const constituencySupport = await Voter.aggregate([
//       { $match: constituencyVoterMatch },
//       {
//         $lookup: {
//           from: "constituencies",
//           localField: "constituencyId",
//           foreignField: "_id",
//           as: "constituency",
//         },
//       },
//       { $unwind: "$constituency" },
//       {
//         $group: {
//           _id: { constituencyName: "$constituency.name", supportLevel: "$supportLevel" },
//           count: { $sum: 1 },
//         },
//       },
//       {
//         $group: {
//           _id: "$_id.constituencyName",
//           supports: { $push: { level: "$_id.supportLevel", count: "$count" } },
//         },
//       },
//       { $limit: 10 },
//     ]);

//     // ---- Booth-wise voters (full list, respects constituency/booth filter) ----
//     let boothFullMatch = { companyId: companyObjectId };
//     if (constituencyId) boothFullMatch.constituencyId = new mongoose.Types.ObjectId(constituencyId);
//     if (boothId) boothFullMatch._id = new mongoose.Types.ObjectId(boothId);
//     const boothWiseVotersFull = await Booth.aggregate([
//       { $match: boothFullMatch },
//       { $project: { boothNumber: 1, name: 1, totalVoters: 1, constituencyId: 1 } },
//       { $sort: { totalVoters: -1 } },
//     ]);

//     // ---- Booth-wise expenses ----
//     let boothExpensePipeline = [{ $match: expenseMatch }];
//     if (boothId) {
//       boothExpensePipeline.push({ $match: { booth: new mongoose.Types.ObjectId(boothId) } });
//     } else if (constituencyId) {
//       boothExpensePipeline.push(
//         { $lookup: { from: "booths", localField: "booth", foreignField: "_id", as: "boothInfo" } },
//         { $unwind: "$boothInfo" },
//         { $match: { "boothInfo.constituencyId": new mongoose.Types.ObjectId(constituencyId) } }
//       );
//     } else {
//       // No filter -> show all booths with expenses
//       boothExpensePipeline.push(
//         { $lookup: { from: "booths", localField: "booth", foreignField: "_id", as: "boothInfo" } },
//         { $unwind: "$boothInfo" }
//       );
//     }
//     boothExpensePipeline.push(
//       {
//         $group: {
//           _id: { id: "$boothInfo._id", number: "$boothInfo.boothNumber", name: "$boothInfo.name" },
//           totalExpense: { $sum: "$amount" },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           boothId: "$_id.id",
//           boothNumber: "$_id.number",
//           boothName: "$_id.name",
//           totalExpense: 1,
//         },
//       },
//       { $sort: { totalExpense: -1 } }
//     );
//     const boothWiseExpenses = await ElectionExpense.aggregate(boothExpensePipeline);

//     // ---- Booth support distribution ----
//     let boothSupportMatch = { companyId: companyObjectId };
//     if (startDate || endDate) boothSupportMatch.createdAt = dateFilter.createdAt;
//     if (supportLevel) boothSupportMatch.supportLevel = supportLevel;
//     let boothSupportPipeline = [{ $match: boothSupportMatch }];
//     if (boothId) {
//       boothSupportPipeline.push({ $match: { booth: new mongoose.Types.ObjectId(boothId) } });
//     } else if (constituencyId) {
//       boothSupportPipeline.push(
//         { $lookup: { from: "booths", localField: "booth", foreignField: "_id", as: "boothInfo" } },
//         { $unwind: "$boothInfo" },
//         { $match: { "boothInfo.constituencyId": new mongoose.Types.ObjectId(constituencyId) } }
//       );
//     } else {
//       // global booth support (join)
//       boothSupportPipeline.push(
//         { $lookup: { from: "booths", localField: "booth", foreignField: "_id", as: "boothInfo" } },
//         { $unwind: "$boothInfo" }
//       );
//     }
//     boothSupportPipeline.push(
//       {
//         $group: {
//           _id: { boothNumber: "$boothInfo.boothNumber", supportLevel: "$supportLevel" },
//           count: { $sum: 1 },
//         },
//       },
//       {
//         $group: {
//           _id: "$_id.boothNumber",
//           supports: { $push: { level: "$_id.supportLevel", count: "$count" } },
//         },
//       },
//       { $limit: 20 }
//     );
//     const boothSupport = await Voter.aggregate(boothSupportPipeline);

//     // ---- Worker activity by booth ----
//     let workerBoothPipeline = [
//       { $match: { companyId: companyObjectId, isWorker: true } },
//       { $unwind: "$workerReports" },
//       { $unwind: "$workerReports.activities" },
//     ];
//     if (startDate || endDate) {
//       workerBoothPipeline.push({
//         $match: {
//           "workerReports.activities.date": {
//             ...(startDate && { $gte: new Date(startDate) }),
//             ...(endDate && { $lte: new Date(endDate) }),
//           },
//         },
//       });
//     }
//     if (boothId) {
//       workerBoothPipeline.push({ $match: { "workerReports.booth": new mongoose.Types.ObjectId(boothId) } });
//     } else if (constituencyId) {
//       workerBoothPipeline.push(
//         { $lookup: { from: "booths", localField: "workerReports.booth", foreignField: "_id", as: "boothInfo" } },
//         { $unwind: "$boothInfo" },
//         { $match: { "boothInfo.constituencyId": new mongoose.Types.ObjectId(constituencyId) } }
//       );
//     } else {
//       workerBoothPipeline.push(
//         { $lookup: { from: "booths", localField: "workerReports.booth", foreignField: "_id", as: "boothInfo" } },
//         { $unwind: { path: "$boothInfo", preserveNullAndEmptyArrays: true } }
//       );
//     }
//     workerBoothPipeline.push(
//       {
//         $group: {
//           _id: { boothNumber: { $ifNull: ["$boothInfo.boothNumber", "Unassigned"] }, workerName: "$name" },
//           totalContacts: { $sum: { $ifNull: ["$workerReports.activities.votersContacted", 0] } },
//           totalSurveys: { $sum: { $ifNull: ["$workerReports.activities.newSurveys", 0] } },
//         },
//       },
//       {
//         $group: {
//           _id: "$_id.boothNumber",
//           workers: {
//             $push: {
//               name: "$_id.workerName",
//               contacts: "$totalContacts",
//               surveys: "$totalSurveys",
//             },
//           },
//           totalContacts: { $sum: "$totalContacts" },
//           totalSurveys: { $sum: "$totalSurveys" },
//         },
//       },
//       { $sort: { totalContacts: -1 } },
//       { $limit: 10 }
//     );
//     const workerActivityByBooth = await CompanyUser.aggregate(workerBoothPipeline);

//     return NextResponse.json({
//       success: true,
//       data: {
//         supportDistribution,
//         boothWiseVoters,
//         voterTrend,
//         expenseByCategory,
//         workerActivities,
//         electionTypeDistribution,
//         constituencyWiseVoters,
//         constituencyWiseExpenses,
//         constituencySupport,
//         boothWiseVotersFull,
//         boothWiseExpenses,
//         boothSupport,
//         workerActivityByBooth,
//       },
//     });
//   } catch (err) {
//     console.error("Analytics aggregation error:", err);
//     return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
//   }
// }



// // app/api/election/dashboard/analytics/route.js
// import { NextResponse } from "next/server";
// import mongoose from "mongoose";
// import dbConnect from "@/lib/db";
// import Voter from "@/models/election/Voter";
// import Booth from "@/models/election/Booth";
// import Constituency from "@/models/election/Constituency";
// import ElectionExpense from "@/models/election/ElectionExpense";
// import CompanyUser from "@/models/CompanyUser";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// // अपने मौजूदा auth हेल्पर्स का उपयोग करें (कोई बदलाव नहीं)
// function isAuthorized(user) {
//   if (!user) return false;
//   if (user.type === "company") return true;
//   const allowedRoles = ["admin", "election manager"];
//   const userRoles = Array.isArray(user.roles) ? user.roles : [];
//   return userRoles.some((role) => allowedRoles.includes(role.trim().toLowerCase()));
// }

// async function validateUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Token missing", status: 401 };
//   try {
//     const user = await verifyJWT(token);
//     if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
//     return { user };
//   } catch {
//     return { error: "Invalid token", status: 401 };
//   }
// }

// // ... existing imports and validateUser, dbConnect, etc.

// export async function GET(req) {
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   await dbConnect();
//   const companyObjectId = new mongoose.Types.ObjectId(user.companyId);

//   try {
//     // ---------- Existing aggregations (no change) ----------
//     const supportDistribution = await Voter.aggregate([
//       { $match: { companyId: companyObjectId } },
//       { $group: { _id: "$supportLevel", count: { $sum: 1 } } },
//     ]);

//     const boothWiseVoters = await Booth.aggregate([
//       { $match: { companyId: companyObjectId } },
//       { $project: { boothNumber: 1, name: 1, totalVoters: 1 } },
//       { $sort: { totalVoters: -1 } },
//       { $limit: 10 },
//     ]);

//     const voterTrend = await Voter.aggregate([
//       { $match: { companyId: companyObjectId } },
//       {
//         $group: {
//           _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
//           count: { $sum: 1 },
//         },
//       },
//       { $sort: { _id: 1 } },
//     ]);

//     const expenseByCategory = await ElectionExpense.aggregate([
//       { $match: { companyId: companyObjectId } },
//       { $group: { _id: "$category", total: { $sum: "$amount" } } },
//     ]);

//     const workerActivities = await CompanyUser.aggregate([
//       { $match: { companyId: companyObjectId, isWorker: true } },
//       { $unwind: { path: "$workerReports", preserveNullAndEmptyArrays: true } },
//       { $unwind: { path: "$workerReports.activities", preserveNullAndEmptyArrays: true } },
//       {
//         $group: {
//           _id: { id: "$_id", name: "$name", role: "$workerRole" },
//           totalContacts: { $sum: { $ifNull: ["$workerReports.activities.votersContacted", 0] } },
//           totalSurveys: { $sum: { $ifNull: ["$workerReports.activities.newSurveys", 0] } },
//         },
//       },
//       {
//         $project: {
//           _id: 0,
//           id: "$_id.id",
//           name: "$_id.name",
//           workerRole: "$_id.role",
//           totalContacts: 1,
//           totalSurveys: 1,
//         },
//       },
//       { $sort: { totalContacts: -1 } },
//       { $limit: 10 },
//     ]);

//     const electionTypeDistribution = await Constituency.aggregate([
//       { $match: { companyId: companyObjectId } },
//       { $group: { _id: "$type", count: { $sum: 1 } } },
//       { $sort: { count: -1 } }
//     ]);

//     // ---------- NEW: Constituency-wise aggregations ----------
//     // 1. Voters per constituency
//     const constituencyWiseVoters = await Voter.aggregate([
//       { $match: { companyId: companyObjectId } },
//       {
//         $lookup: {
//           from: "constituencies", // your Constituency collection name in MongoDB
//           localField: "constituencyId",
//           foreignField: "_id",
//           as: "constituency"
//         }
//       },
//       { $unwind: "$constituency" },
//       {
//         $group: {
//           _id: { id: "$constituency._id", name: "$constituency.name", type: "$constituency.type" },
//           totalVoters: { $sum: 1 }
//         }
//       },
//       {
//         $project: {
//           _id: 0,
//           constituencyId: "$_id.id",
//           constituencyName: "$_id.name",
//           constituencyType: "$_id.type",
//           totalVoters: 1
//         }
//       },
//       { $sort: { totalVoters: -1 } }
//     ]);

//     // 2. Expenses per constituency (if ElectionExpense has constituencyId)
//     const constituencyWiseExpenses = await ElectionExpense.aggregate([
//       { $match: { companyId: companyObjectId } },
//       {
//         $lookup: {
//           from: "constituencies",
//           localField: "constituencyId",
//           foreignField: "_id",
//           as: "constituency"
//         }
//       },
//       { $unwind: "$constituency" },
//       {
//         $group: {
//           _id: { id: "$constituency._id", name: "$constituency.name" },
//           totalExpense: { $sum: "$amount" }
//         }
//       },
//       {
//         $project: {
//           _id: 0,
//           constituencyId: "$_id.id",
//           constituencyName: "$_id.name",
//           totalExpense: 1
//         }
//       },
//       { $sort: { totalExpense: -1 } }
//     ]);

//     // 3. Support distribution per constituency (top 5)
//     const constituencySupport = await Voter.aggregate([
//       { $match: { companyId: companyObjectId } },
//       {
//         $lookup: {
//           from: "constituencies",
//           localField: "constituencyId",
//           foreignField: "_id",
//           as: "constituency"
//         }
//       },
//       { $unwind: "$constituency" },
//       {
//         $group: {
//           _id: {
//             constituencyName: "$constituency.name",
//             supportLevel: "$supportLevel"
//           },
//           count: { $sum: 1 }
//         }
//       },
//       {
//         $group: {
//           _id: "$_id.constituencyName",
//           supports: {
//             $push: {
//               level: "$_id.supportLevel",
//               count: "$count"
//             }
//           }
//         }
//       },
//       { $limit: 10 } // top 10 constituencies
//     ]);

//     return NextResponse.json({
//       success: true,
//       data: {
//         // existing
//         supportDistribution,
//         boothWiseVoters,
//         voterTrend,
//         expenseByCategory,
//         workerActivities,
//         electionTypeDistribution,
//         // new constituency-wise
//         constituencyWiseVoters,
//         constituencyWiseExpenses,
//         constituencySupport
//       },
//     });
//   } catch (err) {
//     console.error("Analytics aggregation error:", err);
//     return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
//   }
// }