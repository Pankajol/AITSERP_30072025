import dbConnect from "@/lib/db";
import EmailCampaign from "@/models/EmailCampaign";
import nodemailer from "nodemailer";
import fetch from "node-fetch"; // node 18+ may have fetch built-in

async function sendCampaignById(id, companyId) {
  try {
    await dbConnect();
    const campaign = await EmailCampaign.findOne({ _id: id, companyId });
    if (!campaign) return { success:false, error:"Campaign not found" };

    // Normalize recipients
    let recipients = [];
    if (campaign.recipientSource === "manual") {
      // accept comma or newline separated
      recipients = (campaign.recipientManual || "").split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
    } else if (campaign.recipientSource === "excel") {
      // TODO: parse excel file at campaign.recipientExcelPath and extract recipients
      // For now fail politely
      return { success:false, error:"Excel recipient parsing not implemented" };
    } else if (campaign.recipientSource === "segment") {
      // TODO: resolve segment to recipients from your DB
      // For now fail politely
      return { success:false, error:"Segment recipient resolution not implemented" };
    }

    if (!recipients.length) return { success:false, error:"No recipients found" };

    if (campaign.channel === "email") {
      // Nodemailer transport
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });

      // send to each recipient (simple approach, can be batched)
      for (const to of recipients) {
        await transporter.sendMail({
          from: process.env.FROM_EMAIL,
          to,
          subject: campaign.emailSubject,
          html: campaign.content,
          attachments: (campaign.attachments || []).map(p => ({ path: p })),
        });
      }

      campaign.status = "Sent";
      await campaign.save();
      return { success:true };
    }

    if (campaign.channel === "whatsapp") {
      const token = process.env.META_WHATSAPP_TOKEN;
      const phoneId = process.env.META_PHONE_NUMBER_ID;
      if (!token || !phoneId) return { success:false, error:"WhatsApp config missing" };

      // send via Meta Cloud API to every recipient (assume recipients are phone numbers with country codes)
      for (const to of recipients) {
        const body = {
          messaging_product: "whatsapp",
          to: to.replace(/\D/g,''), // sanitize
          type: "text",
          text: { body: campaign.content }
        };

        const res = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type":"application/json" },
          body: JSON.stringify(body)
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("WhatsApp send failed:", text);
          // continue and mark failure at end
        }
      }

      campaign.status = "Sent";
      await campaign.save();
      return { success:true };
    }

    return { success:false, error:"Unknown channel" };
  } catch (err) {
    console.error("sendCampaignById err:", err);
    try {
      const campaign = await EmailCampaign.findById(id);
      if (campaign) { campaign.status = "Failed"; await campaign.save(); }
    } catch(e){}
    return { success:false, error: err.message };
  }
}

export default sendCampaignById;
