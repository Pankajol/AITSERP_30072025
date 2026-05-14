import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import LedgerEntry from "@/models/accounts/LedgerEntry";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fiscalYear = searchParams.get("fiscalYear");
    const asOnDate = searchParams.get("asOnDate");
    const compareWith = searchParams.get("compareWith");

    if (!fiscalYear) {
      return NextResponse.json({ success: false, message: "fiscalYear is required" }, { status: 400 });
    }

    const companyId = new mongoose.Types.ObjectId(user.companyId);

    // Helper to get balances for a period
    const getBalancesForPeriod = async (fy, snapshotDate = null) => {
      const match = { companyId, fiscalYear: fy };
      if (snapshotDate) {
        const endDate = new Date(snapshotDate);
        endDate.setHours(23, 59, 59, 999);
        match.date = { $lte: endDate };
      }

      const balances = await LedgerEntry.aggregate([
        { $match: match },
        { $sort: { accountId: 1, date: 1, createdAt: 1 } },
        {
          $group: {
            _id: "$accountId",
            accountName: { $last: "$accountName" },
            closingBalance: { $last: "$balance" },
          },
        },
        {
          $lookup: {
            from: "accountheads",
            localField: "_id",
            foreignField: "_id",
            as: "account",
          },
        },
        { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            name: { $ifNull: ["$account.name", "$accountName"] },
            code: "$account.code",
            type: "$account.type",
            group: "$account.group",
            parentId: "$account.parentId",
            isSystemAccount: "$account.isSystemAccount",
            closingBalance: { $abs: "$closingBalance" },
          },
        },
      ]);

      const assets = balances.filter(b => b.type === "Asset");
      const liabilities = balances.filter(b => b.type === "Liability");
      const equity = balances.filter(b => b.type === "Equity");

      return {
        assets: { items: assets },
        liabilities: { items: liabilities },
        equity: { items: equity },
        totals: {
          totalAssets: assets.reduce((s, a) => s + Math.abs(a.closingBalance), 0),
          totalLiabilities: liabilities.reduce((s, l) => s + Math.abs(l.closingBalance), 0),
          totalEquity: equity.reduce((s, e) => s + Math.abs(e.closingBalance), 0),
        },
      };
    };

    const currentData = await getBalancesForPeriod(fiscalYear, asOnDate);
    let previousData = null;
    if (compareWith) {
      previousData = await getBalancesForPeriod(compareWith);
    }

    const totalLE = currentData.totals.totalLiabilities + currentData.totals.totalEquity;
    const isBalanced = Math.abs(currentData.totals.totalAssets - totalLE) < 1;

    const currentAssets = currentData.assets.items
      .filter(a => a.group === "Current Asset")
      .reduce((s, a) => s + Math.abs(a.closingBalance), 0);
    const currentLiabilities = currentData.liabilities.items
      .filter(l => l.group === "Current Liability")
      .reduce((s, l) => s + Math.abs(l.closingBalance), 0);

    const ratios = {
      currentRatio: currentLiabilities > 0 ? (currentAssets / currentLiabilities).toFixed(2) : "N/A",
      debtToEquity: currentData.totals.totalEquity > 0
        ? (currentData.totals.totalLiabilities / currentData.totals.totalEquity).toFixed(2)
        : "N/A",
    };

    return NextResponse.json({
      success: true,
      fiscalYear,
      asOnDate: asOnDate || null,
      data: currentData,
      previousData,
      totals: currentData.totals,
      ratios,
      balanced: isBalanced,
    });
  } catch (err) {
    console.error("Balance Sheet error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}



// // 📁 src/app/api/accounts/reports/balance-sheet/route.js
// import { NextResponse } from "next/server";
// import mongoose from "mongoose";
// import connectDB from "@/lib/db";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import LedgerEntry from "@/models/accounts/LedgerEntry";

// export async function GET(req) {
//   try {
//     await connectDB();
//     const user = verifyJWT(getTokenFromHeader(req));
//     if (!user) {
//       return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
//     }

//     const { searchParams } = new URL(req.url);
//     const fiscalYear = searchParams.get("fiscalYear");
//     const asOnDate = searchParams.get("asOnDate");
//     const compareWith = searchParams.get("compareWith"); // optional

//     if (!fiscalYear) {
//       return NextResponse.json({ success: false, message: "fiscalYear is required" }, { status: 400 });
//     }

//     const companyId = new mongoose.Types.ObjectId(user.companyId);

//     // Helper function to get balances for a given fiscal year and optional as-on date
//     const getBalancesForPeriod = async (fy, snapshotDate = null) => {
//       const match = { companyId, fiscalYear: fy };
//       if (snapshotDate) {
//         const endDate = new Date(snapshotDate);
//         endDate.setHours(23, 59, 59, 999);
//         match.date = { $lte: endDate };
//       }

//       const balances = await LedgerEntry.aggregate([
//         { $match: match },
//         { $sort: { accountId: 1, date: 1, createdAt: 1 } },
//         {
//           $group: {
//             _id: "$accountId",
//             accountName: { $last: "$accountName" },
//             closingBalance: { $last: "$balance" },
//           },
//         },
//         {
//           $lookup: {
//             from: "accountheads",
//             localField: "_id",
//             foreignField: "_id",
//             as: "account",
//           },
//         },
//         { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
//         {
//           $project: {
//             _id: 1,
//             name: { $ifNull: ["$account.name", "$accountName"] },
//             code: "$account.code",
//             type: "$account.type",
//             group: "$account.group",
//             parentId: "$account.parentId",
//             isSystemAccount: "$account.isSystemAccount",
//             closingBalance: { $abs: "$closingBalance" },
//           },
//         },
//       ]);

//       const assets = balances.filter(b => b.type === "Asset");
//       const liabilities = balances.filter(b => b.type === "Liability");
//       const equity = balances.filter(b => b.type === "Equity");

//       return {
//         assets: { items: assets },
//         liabilities: { items: liabilities },
//         equity: { items: equity },
//         totals: {
//           totalAssets: assets.reduce((s, a) => s + Math.abs(a.closingBalance), 0),
//           totalLiabilities: liabilities.reduce((s, l) => s + Math.abs(l.closingBalance), 0),
//           totalEquity: equity.reduce((s, e) => s + Math.abs(e.closingBalance), 0),
//         },
//       };
//     };

//     // Get current period data
//     const currentData = await getBalancesForPeriod(fiscalYear, asOnDate);

//     // Get previous period data for comparison if requested
//     let previousData = null;
//     if (compareWith) {
//       previousData = await getBalancesForPeriod(compareWith);
//     }

//     const totalLE = currentData.totals.totalLiabilities + currentData.totals.totalEquity;
//     const isBalanced = Math.abs(currentData.totals.totalAssets - totalLE) < 1;

//     // Ratios
//     const currentAssets = currentData.assets.items.filter(a => a.group === "Current Asset").reduce((s, a) => s + Math.abs(a.closingBalance), 0);
//     const currentLiabilities = currentData.liabilities.items.filter(l => l.group === "Current Liability" || l.group === "Current Liability").reduce((s, l) => s + Math.abs(l.closingBalance), 0);
//     const ratios = {
//       currentRatio: currentLiabilities > 0 ? (currentAssets / currentLiabilities).toFixed(2) : "N/A",
//       debtToEquity: currentData.totals.totalEquity > 0 ? (currentData.totals.totalLiabilities / currentData.totals.totalEquity).toFixed(2) : "N/A",
//     };

//     return NextResponse.json({
//       success: true,
//       fiscalYear,
//       asOnDate: asOnDate || null,
//       data: currentData,
//       previousData,
//       totals: currentData.totals,
//       ratios,
//       balanced: isBalanced,
//     });
//   } catch (err) {
//     console.error("Balance Sheet error:", err);
//     return NextResponse.json({ success: false, message: err.message }, { status: 500 });
//   }
// }