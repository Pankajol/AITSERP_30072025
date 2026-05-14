import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import SalesInvoice from "@/models/SalesInvoice";
import PurchaseInvoice from "@/models/InvoiceModel";
import Item from "@/models/ItemModels"

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // format: 2026-04
    if (!month) return NextResponse.json({ success: false, message: "month required (YYYY-MM)" }, { status: 400 });

    const [year, m] = month.split("-");
    const startDate = new Date(year, m - 1, 1);
    const endDate = new Date(year, m, 0, 23, 59, 59);

    const companyId = new mongoose.Types.ObjectId(user.companyId);

    // Outward supplies (Sales)
    const sales = await SalesInvoice.aggregate([
      { $match: { companyId, invoiceDate: { $gte: startDate, $lte: endDate }, status: { $ne: "Cancelled" } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.gstRate",
          totalTaxable: { $sum: { $subtract: ["$items.totalAmount", { $ifNull: ["$items.gstAmount", 0] }] } },
          totalCgst: { $sum: { $ifNull: ["$items.cgstAmount", 0] } },
          totalSgst: { $sum: { $ifNull: ["$items.sgstAmount", 0] } },
          totalIgst: { $sum: { $ifNull: ["$items.igstAmount", 0] } },
        },
      },
    ]);

    // Inward supplies (Purchases) – for ITC
    const purchases = await PurchaseInvoice.aggregate([
      { $match: { companyId, postingDate: { $gte: startDate, $lte: endDate }, status: { $ne: "Cancelled" } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.gstRate",
          totalTaxable: { $sum: { $subtract: ["$items.totalAmount", { $ifNull: ["$items.gstAmount", 0] }] } },
          totalCgst: { $sum: { $ifNull: ["$items.cgstAmount", 0] } },
          totalSgst: { $sum: { $ifNull: ["$items.sgstAmount", 0] } },
          totalIgst: { $sum: { $ifNull: ["$items.igstAmount", 0] } },
        },
      },
    ]);

    const outputTax = { cgst: 0, sgst: 0, igst: 0 };
    sales.forEach(s => {
      outputTax.cgst += s.totalCgst;
      outputTax.sgst += s.totalSgst;
      outputTax.igst += s.totalIgst;
    });

    const inputTax = { cgst: 0, sgst: 0, igst: 0 };
    purchases.forEach(p => {
      inputTax.cgst += p.totalCgst;
      inputTax.sgst += p.totalSgst;
      inputTax.igst += p.totalIgst;
    });

    const netPayable = {
      cgst: outputTax.cgst - inputTax.cgst,
      sgst: outputTax.sgst - inputTax.sgst,
      igst: outputTax.igst - inputTax.igst,
    };

    return NextResponse.json({
      success: true,
      month,
      outwardSupplies: sales,
      inwardSupplies: purchases,
      outputTax,
      inputTax,
      netPayable,
    });
  } catch (err) {
    console.error("GSTR-3B error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}