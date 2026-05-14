// 📁 src/app/api/accounts/reports/ageing/customer/route.js
// 📁 src/app/api/accounts/reports/ageing/supplier/route.js
// Both share same logic — only partyType differs

import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Transaction from "@/models/accounts/Transaction";

async function ageingReport(req, partyType) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const asOfDate = searchParams.get("asOfDate")
      ? new Date(searchParams.get("asOfDate"))
      : new Date();

    // Get all unpaid invoices for the party type
    const invoiceType = partyType === "Customer" ? "Sales Invoice" : "Purchase Invoice";
    const paymentType = partyType === "Customer" ? "Receipt"       : "Payment";

    // All invoices
    const invoices = await Transaction.find({
      companyId: user.companyId,
      type:      invoiceType,
      status:    "Posted",
    }).sort({ date: 1 });

    // All payments — to calculate outstanding
    const payments = await Transaction.find({
      companyId: user.companyId,
      type:      paymentType,
      status:    "Posted",
    });

    // Group payments by partyId
    const paidByParty = payments.reduce((acc, p) => {
      const id = p.partyId?.toString();
      if (id) acc[id] = (acc[id] || 0) + p.totalAmount;
      return acc;
    }, {});

    // Build ageing per party
    const partyMap = {};
    for (const inv of invoices) {
      const id   = inv.partyId?.toString() || inv.partyName;
      const paid = paidByParty[id] || 0;
      const outstanding = inv.totalAmount - paid;
      if (outstanding <= 0) continue;

      const days = Math.floor((asOfDate - new Date(inv.date)) / (1000 * 60 * 60 * 24));
      const bucket = days <= 30 ? "0-30" : days <= 60 ? "31-60" : days <= 90 ? "61-90" : "90+";

      if (!partyMap[id]) {
        partyMap[id] = {
          partyId:   inv.partyId,
          partyName: inv.partyName,
          total:     0,
          "0-30":    0, "31-60": 0, "61-90": 0, "90+": 0,
          invoices:  [],
        };
      }
      partyMap[id][bucket]  += outstanding;
      partyMap[id].total    += outstanding;
      partyMap[id].invoices.push({
        transactionNumber: inv.transactionNumber,
        date:              inv.date,
        amount:            inv.totalAmount,
        outstanding,
        days,
        bucket,
      });
    }

    const rows = Object.values(partyMap).sort((a, b) => b.total - a.total);

    // Summary buckets totals
    const buckets = rows.reduce((acc, r) => {
      acc["0-30"]  += r["0-30"]  || 0;
      acc["31-60"] += r["31-60"] || 0;
      acc["61-90"] += r["61-90"] || 0;
      acc["90+"]   += r["90+"]   || 0;
      acc.total    += r.total    || 0;
      return acc;
    }, { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0, total: 0 });

    return NextResponse.json({
      success: true,
      report:  `${partyType} Ageing`,
      asOfDate,
      data:    rows,
      buckets,
    });
  } catch (err) {
    console.error(`GET ageing/${partyType} error:`, err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ── Customer ageing export ──
export const customerAgeing = (req) => ageingReport(req, "Customer");
// ── Supplier ageing export ──
export const supplierAgeing = (req) => ageingReport(req, "Supplier");

// For customer route file — export GET
export async function GET(req) { return ageingReport(req, "Customer"); }