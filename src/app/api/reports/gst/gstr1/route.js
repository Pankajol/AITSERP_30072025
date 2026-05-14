import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Item from "@/models/ItemModels";
import SalesInvoice from "@/models/SalesInvoice";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    if (!fromDate || !toDate) {
      return NextResponse.json({ success: false, message: "fromDate and toDate are required" }, { status: 400 });
    }

    const companyId = new mongoose.Types.ObjectId(user.companyId);
    const invoices = await SalesInvoice.find({
      companyId,
      invoiceDate: { $gte: new Date(fromDate), $lte: new Date(toDate) },
      status: { $ne: "Cancelled" },
    }).populate("items.item", "hsnCode");   // ✅ Now works because Item is registered

    // Group by GST rate and tax type (CGST/SGST/IGST)
    const summary = {
      B2B: [],      // Business to Business (with GSTIN)
      B2C: [],      // Business to Consumer (without GSTIN)
    };
    let totalTaxableValue = 0;
    let totalCgst = 0, totalSgst = 0, totalIgst = 0;

    for (const inv of invoices) {
      const customerHasGst = inv.customerGstin && inv.customerGstin.length === 15;
      const section = customerHasGst ? "B2B" : "B2C";
      for (const item of inv.items) {
        const gstRate = item.gstRate || 0;
        const taxable = item.totalAmount - (item.gstAmount || 0);
        const cgst = item.cgstAmount || 0;
        const sgst = item.sgstAmount || 0;
        const igst = item.igstAmount || 0;

        totalTaxableValue += taxable;
        totalCgst += cgst;
        totalSgst += sgst;
        totalIgst += igst;

        summary[section].push({
          invoiceNo: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate,
          customerName: inv.customerName,
          customerGstin: inv.customerGstin || "",
          itemName: item.itemName,
          hsn: item.item?.hsnCode || "",
          taxableValue: taxable,
          gstRate,
          cgst,
          sgst,
          igst,
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary,
      totals: {
        totalTaxableValue,
        totalCgst,
        totalSgst,
        totalIgst,
        totalGst: totalCgst + totalSgst + totalIgst,
      },
    });
  } catch (err) {
    console.error("GSTR-1 error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}