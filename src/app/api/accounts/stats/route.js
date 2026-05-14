import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import SalesInvoice from "@/models/SalesInvoice";
import PurchaseInvoice from "@/models/InvoiceModel";
import LedgerEntry from "@/models/accounts/LedgerEntry";
import AccountHead from "@/models/accounts/AccountHead";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const companyId = new mongoose.Types.ObjectId(user.companyId);

    // Get current month range
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 1. Total Sales Invoices (current month)
    const salesTotal = await SalesInvoice.aggregate([
      { $match: { companyId, createdAt: { $gte: startOfMonth, $lte: endOfMonth }, status: { $ne: "Cancelled" } } },
      { $group: { _id: null, total: { $sum: "$grandTotal" } } },
    ]);

    // 2. Total Purchase Invoices (current month)
    const purchaseTotal = await PurchaseInvoice.aggregate([
      { $match: { companyId, createdAt: { $gte: startOfMonth, $lte: endOfMonth }, status: { $ne: "Cancelled" } } },
      { $group: { _id: null, total: { $sum: "$grandTotal" } } },
    ]);

    // 3. Cash & Bank Balance (sum of all Asset accounts with "Bank" or "Cash")
    const bankAccounts = await AccountHead.find({
      companyId,
      type: "Asset",
      $or: [
        { group: "Bank Account" },
        { group: "Current Asset", name: { $regex: /cash|bank/i } },
      ],
      isActive: true,
    }).select("_id");
    const accountIds = bankAccounts.map(a => a._id);
    let cashBalance = 0;
    if (accountIds.length) {
      const latestEntries = await LedgerEntry.aggregate([
        { $match: { companyId, accountId: { $in: accountIds } } },
        { $sort: { date: -1, createdAt: -1 } },
        { $group: { _id: "$accountId", balance: { $first: "$balance" } } },
      ]);
      cashBalance = latestEntries.reduce((sum, e) => sum + (e.balance || 0), 0);
    }

    // 4. Accounts Receivable (total outstanding from Sales Invoices)
    const receivableTotal = await SalesInvoice.aggregate([
      { $match: { companyId, paymentStatus: { $in: ["Pending", "Partial"] }, status: { $ne: "Cancelled" } } },
      { $group: { _id: null, total: { $sum: "$remainingAmount" } } },
    ]);

    // 5. Accounts Payable (total outstanding from Purchase Invoices)
    const payableTotal = await PurchaseInvoice.aggregate([
      { $match: { companyId, paymentStatus: { $in: ["Pending", "Partial"] }, status: { $ne: "Cancelled" } } },
      { $group: { _id: null, total: { $sum: "$remainingAmount" } } },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalSales: salesTotal[0]?.total || 0,
        totalPurchases: purchaseTotal[0]?.total || 0,
        cashBalance,
        accountsReceivable: receivableTotal[0]?.total || 0,
        accountsPayable: payableTotal[0]?.total || 0,
      },
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}