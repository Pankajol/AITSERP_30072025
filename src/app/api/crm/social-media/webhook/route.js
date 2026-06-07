// app/api/social-media/webhook/route.js
import dbConnect from "@/lib/db";
import { getCompanyFromApiKey } from "@/lib/auth"; // you'll need to pass company API key in header
import Lead from "@/models/crm/load";
import SocialMediaLead from "@/models/crm/SocialMediaLead";
import { NextResponse } from "next/server";

export async function POST(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get('platform');
  const apiKey = req.headers.get('x-api-key'); // company identifies via API key
  const company = await getCompanyFromApiKey(apiKey);
  if (!company) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rawBody = await req.json();
  
  // Parse based on platform
  let leadData = null;
  if (platform === 'facebook' || platform === 'instagram') {
    leadData = {
      firstName: rawBody.first_name || rawBody.from?.name?.split(' ')[0] || '',
      lastName: rawBody.last_name || '',
      email: rawBody.email || '',
      mobileNo: rawBody.phone_number || '',
      source: platform,
      status: 'New',
      companyId: company._id,
      socialMediaProfile: { platform, profileId: rawBody.id || rawBody.sender_id, username: rawBody.username }
    };
  } else if (platform === 'whatsapp') {
    // WhatsApp Business API webhook
    leadData = {
      firstName: rawBody.profile?.name || '',
      mobileNo: rawBody.from || '',
      source: 'whatsapp',
      companyId: company._id,
      socialMediaProfile: { platform, profileId: rawBody.from }
    };
  } else if (platform === 'shopify') {
    // Shopify customer created webhook
    leadData = {
      firstName: rawBody.customer?.first_name || '',
      lastName: rawBody.customer?.last_name || '',
      email: rawBody.customer?.email,
      mobileNo: rawBody.customer?.phone,
      source: 'shopify',
      companyId: company._id,
      socialMediaProfile: { platform, profileId: rawBody.customer?.id.toString() }
    };
  } else if (platform === 'indiamart') {
    // IndiaMart lead webhook
    leadData = {
      firstName: rawBody.lead_attr?.name?.split(' ')[0] || '',
      lastName: rawBody.lead_attr?.name?.split(' ')[1] || '',
      mobileNo: rawBody.lead_attr?.mobile,
      email: rawBody.lead_attr?.email,
      source: 'indiamart',
      companyId: company._id,
      socialMediaProfile: { platform, profileId: rawBody.lead_attr?.lead_id }
    };
  }

  if (!leadData) return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });

  // Create lead
  const lead = await Lead.create(leadData);
  
  // Log webhook
  await SocialMediaLead.create({
    companyId: company._id,
    platform,
    rawData: rawBody,
    processed: true,
    leadId: lead._id
  });

  // Trigger automation events
  await handleEvent({ companyId: company._id, entity: 'Lead', entityId: lead._id, action: 'created', data: lead });

  return NextResponse.json({ success: true, leadId: lead._id });
}