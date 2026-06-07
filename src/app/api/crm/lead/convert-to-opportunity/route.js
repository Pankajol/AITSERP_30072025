import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Lead from "@/models/crm/load";
import Opportunity from "@/models/crm/Opportunity";
import { NextResponse } from "next/server";
import { handleEvent } from "@/lib/services/automationEngine";

export async function POST(req) {
  await dbConnect();
  const token = getTokenFromHeader(req);
  const decoded = verifyJWT(token);
  const { leadId, opportunityData } = await req.json();

  const lead = await Lead.findOne({ _id: leadId, companyId: decoded.companyId });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.convertedToOpportunity) {
    return NextResponse.json({ error: "Lead already converted" }, { status: 400 });
  }

  // Extract custom fields (if any)
  const custom = lead.customFields || {};

  // Build full opportunity object from lead data + frontend overrides
  const oppData = {
    companyId: decoded.companyId,

    // Basic info
    opportunityName: opportunityData.opportunityName || `${lead.firstName} ${lead.lastName} - ${lead.organizationName || "Deal"}`,
    accountName: opportunityData.accountName || lead.organizationName || `${lead.firstName} ${lead.lastName}`,
    value: opportunityData.value || 0,
    stage: opportunityData.stage || "Qualification",
    closeDate: opportunityData.closeDate || new Date(Date.now() + 30 * 86400000),
    probability: opportunityData.probability || 20,
    leadSource: opportunityData.leadSource || lead.source || "Lead Conversion",
    description: opportunityData.description || `Converted from lead: ${lead.firstName} ${lead.lastName}`,

    // Contact & tax (from lead or custom)
    email: opportunityData.email || lead.email || "",
    phone: opportunityData.phone || lead.phone || "",
    mobile: opportunityData.mobile || lead.mobileNo || "",
    pan: opportunityData.pan || custom.pan || "",
    gst: opportunityData.gst || custom.gstNumber || custom.gst || "",

    // Addresses
    billingAddress: {
      street: opportunityData.billingAddress?.street || custom.street || "",
      city: opportunityData.billingAddress?.city || lead.city || "",
      state: opportunityData.billingAddress?.state || lead.state || "",
      postalCode: opportunityData.billingAddress?.postalCode || custom.postalCode || custom.zipCode || "",
      country: opportunityData.billingAddress?.country || "India",
    },
    shippingAddress: {
      street: opportunityData.shippingAddress?.street || custom.street || "",
      city: opportunityData.shippingAddress?.city || lead.city || "",
      state: opportunityData.shippingAddress?.state || lead.state || "",
      postalCode: opportunityData.shippingAddress?.postalCode || custom.postalCode || custom.zipCode || "",
      country: opportunityData.shippingAddress?.country || "India",
    },
  };

  const newOpportunity = new Opportunity(oppData);
  const savedOpp = await newOpportunity.save();

  // Update lead
  lead.status = "Converted";
  lead.convertedToOpportunity = savedOpp._id;
  lead.qualifiedOn = new Date();
  lead.qualifiedBy = decoded.id;
  await lead.save();

  // Trigger automation
  await handleEvent({
    companyId: decoded.companyId,
    entity: "Opportunity",
    entityId: savedOpp._id,
    action: "created",
    data: savedOpp
  });

  return NextResponse.json({
    success: true,
    opportunity: savedOpp,
    lead: { _id: lead._id, status: lead.status }
  });
}