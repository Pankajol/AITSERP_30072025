import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import SalesInvoice from "@/models/SalesInvoice";
import PurchaseInvoice from "@/models/InvoiceModel";
import mongoose from "mongoose";

function getBucket(dueDate, asOfDate) {
  const asOf = asOfDate ? new Date(asOfDate) : new Date();
  const diff = Math.floor((asOf - new Date(dueDate)) / 86400000);
  if (diff <= 30) return 0;
  if (diff <= 60) return 1;
  if (diff <= 90) return 2;
  if (diff <= 120) return 3;
  return 4;
}

export async function GET(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const user = verifyJWT(token);
    if (!user || !user.companyId) {
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const partyType = searchParams.get("partyType") || "Customer";
    const partyId = searchParams.get("partyId");
    const asOfDate = searchParams.get("asOf") || new Date().toISOString().slice(0, 10);

    if (!partyId) {
      return NextResponse.json({ success: false, message: "partyId is required" }, { status: 400 });
    }

    // Validate partyId
    if (!mongoose.Types.ObjectId.isValid(partyId)) {
      return NextResponse.json({ success: false, message: "Invalid party ID format" }, { status: 400 });
    }

    // Fetch invoices for the party
    let invoices = [];
    let partyName = "";
    let partyCode = "";

    if (partyType === "Customer") {
      const Customer = await import("@/models/CustomerModel").then(m => m.default);
      const customer = await Customer.findById(partyId);
      if (customer) {
        partyName = customer.customerName;
        partyCode = customer.customerCode;
      }
      
      invoices = await SalesInvoice.find({
        companyId: user.companyId,
        customer: new mongoose.Types.ObjectId(partyId),
        paymentStatus: { $ne: "Paid" },
        status: { $nin: ["Cancelled", "Draft"] }
      }).select("grandTotal paidAmount remainingAmount dueDate invoiceNumber");
    } else {
      const Supplier = await import("@/models/SupplierModels").then(m => m.default);
      const supplier = await Supplier.findById(partyId);
      if (supplier) {
        partyName = supplier.supplierName;
        partyCode = supplier.supplierCode;
      }
      
      invoices = await PurchaseInvoice.find({
        companyId: user.companyId,
        supplier: new mongoose.Types.ObjectId(partyId),
        paymentStatus: { $ne: "Paid" },
        status: { $nin: ["Cancelled", "Draft"] }
      }).select("grandTotal paidAmount remainingAmount dueDate documentNumberPurchaseInvoice");
    }

    const buckets = [0, 0, 0, 0, 0];
    let totalOutstanding = 0;
    let overdueAmount = 0;

    for (const invoice of invoices) {
      const outstanding = invoice.remainingAmount || (invoice.grandTotal - (invoice.paidAmount || 0));
      if (outstanding <= 0) continue;
      
      totalOutstanding += outstanding;
      
      const dueDate = invoice.dueDate || invoice.createdAt;
      if (dueDate) {
        const bucket = getBucket(dueDate, asOfDate);
        buckets[bucket] += outstanding;
        if (bucket > 0) overdueAmount += outstanding;
      } else {
        buckets[0] += outstanding; // Default to current if no due date
      }
    }

    // Get worst bucket for status badge
    const worstBucket = buckets.reduce((worst, v, i) => v > 0 ? i : worst, 0);

    return NextResponse.json({
      success: true,
      data: {
        partyId,
        partyName,
        partyCode,
        buckets,
        totalOutstanding,
        overdueAmount,
        worstBucket,
        invoiceCount: invoices.length,
        asOfDate,
      },
    });
  } catch (error) {
    console.error("Ageing API error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}