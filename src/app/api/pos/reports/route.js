export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import POSInvoice from "@/models/pos/POSInvoice"; 
import POSCustomer from "@/models/pos/POSCustomer"; // Keep this to ensure schema is registered
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    const user = verifyJWT(token);

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "last7";

    /* DATE RANGE LOGIC */
    const now = new Date();
    let fromDate = new Date();

    if (range === "today") {
      fromDate.setHours(0, 0, 0, 0);
    } else if (range === "last7") {
      fromDate.setDate(now.getDate() - 7);
    } else if (range === "last30") {
      fromDate.setDate(now.getDate() - 30);
    }

    /* FETCH INVOICES WITH ALL PAYMENT FIELDS */
    const transactions = await POSInvoice.find({
      companyId: user.companyId,
      createdAt: { $gte: fromDate },
    })
      .populate("customerId", "name mobile gstin")
      .sort({ createdAt: -1 })
      .lean();

    /* SUMMARY CALCULATIONS */
    const summary = transactions.reduce(
      (acc, tx) => {
        acc.revenue += tx.grandTotal || 0;
        acc.taxable += tx.taxableAmount || 0;
        acc.cgst += tx.cgst || 0;
        acc.sgst += tx.sgst || 0;
        
        // 🟢 New Financial Summaries
        acc.totalReceived += tx.paymentReceived || 0;
        acc.totalDue += tx.dueAmount || 0;
        acc.totalReturned += tx.balanceReturned || 0;
        
        acc.count += 1;
        return acc;
      },
      { 
        revenue: 0, 
        taxable: 0, 
        cgst: 0, 
        sgst: 0, 
        totalReceived: 0, 
        totalDue: 0, 
        totalReturned: 0, 
        count: 0 
      }
    );

    return NextResponse.json({
      success: true,
      data: {
        summary,
        transactions, // Each transaction now includes status, dueAmount, etc.
      },
    });
  } catch (err) {
    console.error("POS REPORT ERROR", err);
    return NextResponse.json(
      { success: false, message: "Failed to generate POS report" },
      { status: 500 }
    );
  }
}


// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import POSInvoice from "@/models/pos/POSInvoice"; // your POS invoice model
// import POSCustomer from "@/models/pos/POSCustomer";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { NextResponse } from "next/server";

// /**
//  * GET /api/pos/reports?range=today|last7|last30
//  */
// export async function GET(req) {
//   try {
//     await dbConnect();

//     const token = getTokenFromHeader(req);
//     const user = verifyJWT(token);

//     const { searchParams } = new URL(req.url);
//     const range = searchParams.get("range") || "last7";

//     /* DATE RANGE LOGIC */
//     const now = new Date();
//     let fromDate = new Date();

//     if (range === "today") {
//       fromDate.setHours(0, 0, 0, 0);
//     } else if (range === "last7") {
//       fromDate.setDate(now.getDate() - 7);
//     } else if (range === "last30") {
//       fromDate.setDate(now.getDate() - 30);
//     }

//     /* FETCH INVOICES */
//     const transactions = await POSInvoice.find({
//       companyId: user.companyId,
//       createdAt: { $gte: fromDate },
//     })
//       .populate("customerId", "name mobile gstin")
//       .sort({ createdAt: -1 })
//       .lean();

//     /* SUMMARY CALCULATIONS */
//     const summary = transactions.reduce(
//       (acc, tx) => {
//         acc.revenue += tx.grandTotal || 0;
//         acc.taxable += tx.taxableAmount || 0;
//         acc.cgst += tx.cgst || 0;
//         acc.sgst += tx.sgst || 0;
//         acc.count += 1;
//         return acc;
//       },
//       { revenue: 0, taxable: 0, cgst: 0, sgst: 0, count: 0 }
//     );

      
//     // RESPOND WITH DATA


//     return NextResponse.json({
//       success: true,
//       data: {
//         summary,
//         transactions,
//       },
//     });
//   } catch (err) {
//     console.error("POS REPORT ERROR", err);
//     return NextResponse.json(
//       { success: false, message: "Failed to generate POS report" },
//       { status: 500 }
//     );
//   }
// }
