import EmailCampaign from "@/models/EmailCampaign";
import Lead from "@/models/LeadModel";
import Customer from "@/models/CustomerModel";
import nodemailer from "nodemailer";
import dbConnect from "@/lib/db";

export async function sendCampaignNow(campaignId) {
  await dbConnect();

  const campaign = await EmailCampaign.findById(campaignId);
  if (!campaign) return;

  let recipients = [];

  // -------------------------------
  // HANDLE SEGMENTS
  // -------------------------------
  if (campaign.recipientSource === "segment") {
    if (campaign.recipientList === "source_customers") {
      const customers = await Customer.find({ companyId: campaign.companyId });
      recipients = customers.map(c => c.email).filter(Boolean);
    }

    if (campaign.recipientList === "source_leads") {
      const leads = await Lead.find({ companyId: campaign.companyId });
      recipients = leads.map(l => l.email).filter(Boolean);
    }
  }

  // -------------------------------
  // MANUAL INPUT
  // -------------------------------
  if (campaign.recipientSource === "manual") {
    recipients = campaign.recipientManual
      .split(/[\n,]+/)
      .map(x => x.trim())
      .filter(Boolean);
  }

  if (!recipients.length) return;

  // -------------------------------
  // SEND EMAIL
  // -------------------------------
  if (campaign.channel === "email") {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    for (const email of recipients) {
      await transporter.sendMail({
        from: campaign.sender,
        to: email,
        subject: campaign.emailSubject,
        html: campaign.content,
      });
    }
  }

  // TODO: Add WhatsApp message sending

  campaign.status = "Sent";
  await campaign.save();
}
