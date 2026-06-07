import dbConnect from "@/lib/db";
import { getCompanyIdFromToken } from "@/lib/auth";
import Lead from "@/models/crm/load";
import Opportunity from "@/models/crm/Opportunity";
import Customer from "@/models/CustomerModel";
import SalesQuotation from "@/models/SalesQuotationModel";
import { NextResponse } from "next/server";

export async function GET(req) {
  await dbConnect();
  const companyId = getCompanyIdFromToken(req);
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  const [leads, opportunities, customers, quotes] = await Promise.all([
    Lead.find({ companyId, $text: { $search: q } })
      .select("firstName lastName email mobileNo status leadScore")
      .limit(10),
    Opportunity.find({ companyId, $text: { $search: q } })
      .select("opportunityName accountName value stage")
      .limit(10),
    Customer.find({ companyId, $text: { $search: q } })
      .select("customerName emailId mobileNumber customerCode")
      .limit(10),
    SalesQuotation.find({ companyId, $text: { $search: q } })
      .select("documentNumberQuatation customerName grandTotal status")
      .limit(5),
  ]);

  return NextResponse.json({
    leads,
    opportunities,
    customers,
    quotes,
  });
}