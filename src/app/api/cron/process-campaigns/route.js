export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import EmailCampaign from "@/models/EmailCampaign";
import Lead from "@/models/load"; // ✅ FIXED (was load)
import Customer from "@/models/CustomerModel";
import EmailLog from "@/models/EmailLog";

import nodemailer from "nodemailer";
import * as XLSX from "xlsx";
import path from "path";
import fs from "fs";

// =====================
// WHATSAPP CONFIG
// =====================
const META_URL = "https://graph.facebook.com/v18.0";
const WHATSAPP_PHONE_ID = process.env.PHONE_NUMBER_ID;
const META_TOKEN = process.env.WHATSAPP_TOKEN;

// =====================
// EMAIL CONFIG
// =====================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// =====================
// MAIN CRON
// =====================
export async function GET() {
  try {
    console.log("\n🚀 CRON HIT:", new Date().toISOString());

    await dbConnect();

    const now = new Date(); // ✅ Pure UTC time
    console.log("⏰ CURRENT UTC:", now.toISOString());

    // ✅ ONLY READY CAMPAIGNS (UTC COMPARISON)
    const campaigns = await EmailCampaign.find({
      status: "Scheduled",
      scheduledTime: { $lte: new Date() },
    });

    console.log(`📌 Ready campaigns: ${campaigns.length}`);

    let processed = 0;

    for (const campaign of campaigns) {
      try {
        console.log("\n⚙️ Running Campaign:", campaign.campaignName);
        console.log("➡ Scheduled Time (UTC):", campaign.scheduledTime);

        campaign.status = "Running";
        await campaign.save();

        let recipients = [];

        // ================= SEGMENT =================
        if (campaign.recipientSource === "segment") {
          if (campaign.recipientList === "source_leads") {
            const leads = await Lead.find({ companyId: campaign.companyId });

            recipients = leads
              .map((l) =>
                campaign.channel === "email" ? l.email : l.mobileNo
              )
              .filter(Boolean);
          }

          if (campaign.recipientList === "source_customers") {
            const customers = await Customer.find({
              companyId: campaign.companyId,
            });

            recipients = customers
              .map((c) =>
                campaign.channel === "email" ? c.email : c.mobileNo
              )
              .filter(Boolean);
          }
        }

        // ================= MANUAL =================
        if (campaign.recipientSource === "manual") {
          recipients = campaign.recipientManual
            ?.split(/[\n,]+/)
            .map((x) => x.trim())
            .filter(Boolean);
        }

        // ================= EXCEL =================
        if (campaign.recipientSource === "excel") {
          try {
            const filename = path.basename(campaign.recipientExcelPath);
            const excelPath = path.join(process.cwd(), "uploads", filename);

            if (!fs.existsSync(excelPath)) {
              throw new Error("Excel not found: " + excelPath);
            }

            const workbook = XLSX.readFile(excelPath);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);

            recipients = rows
              .map((r) => r.email || r.phone || r.number)
              .filter(Boolean);

          } catch (err) {
            console.error("❌ EXCEL ERROR:", err.message);
            campaign.status = "Failed";
            await campaign.save();
            continue;
          }
        }

        // ✅ FORMAT WHATSAPP NUMBERS
        if (campaign.channel === "whatsapp") {
          recipients = recipients
            .map((n) => {
              if (!n) return null;
              n = n.toString().replace(/\D/g, "");

              if (n.startsWith("91")) return n;
              if (n.startsWith("0")) return "91" + n.substring(1);

              return "91" + n;
            })
            .filter(Boolean);
        }

        if (!recipients.length) {
          console.log("❌ No recipients found");
          campaign.status = "Failed";
          await campaign.save();
          continue;
        }

        console.log("📨 Total Recipients:", recipients.length);

        // ================= EMAIL SENDING =================
        if (campaign.channel === "email") {
          const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

          for (const email of recipients) {
            const log = await EmailLog.create({
              companyId: campaign.companyId,
              campaignId: campaign._id,
              to: email,
            });

            const openPixel = `
              <img
                src="${BASE_URL}/api/track/email-open?id=${log._id}"
                width="1"
                height="1"
                style="display:none;"
              />
            `;

            const finalHtml = `
              <div>
                ${campaign.content}
                <br/><br/>
                ${openPixel}
              </div>
            `;

            await transporter.sendMail({
              from: campaign.sender,
              to: email,
              subject: campaign.emailSubject,
              html: finalHtml,
            });

            console.log("✅ Email sent:", email);
          }
        }

        // ================= WHATSAPP SENDING =================
        if (campaign.channel === "whatsapp") {
          for (const number of recipients) {
            await fetch(`${META_URL}/${WHATSAPP_PHONE_ID}/messages`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${META_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: number,
                type: "text",
                text: { body: campaign.content },
              }),
            });

            console.log("✅ WhatsApp sent:", number);
          }
        }

        campaign.status = "Sent";
        await campaign.save();

        console.log("✅ FINISHED:", campaign.campaignName);
        processed++;

      } catch (innerErr) {
        console.error("❌ Campaign error:", innerErr);
        campaign.status = "Failed";
        await campaign.save();
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: campaigns.length,
        processed,
        time: now,
      }),
      { status: 200 }
    );

  } catch (err) {
    console.error("❌ CRON ERROR:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}










// import dbConnect from "@/lib/db";
// import EmailCampaign from "@/models/EmailCampaign";
// import nodemailer from "nodemailer";

// export async function GET() {
//   console.log("🚀 CRON HIT:", new Date());

//   try {
//     await dbConnect();
//     console.log("📌 DB Connected");

//     const now = new Date();

//     // Get scheduled campaigns
//     const campaigns = await EmailCampaign.find({
//       status: "Scheduled",
//       scheduledTime: { $lte: now },
//     });

//     console.log("📌 Scheduled campaigns found:", campaigns.length);

//     if (campaigns.length === 0) {
//       return new Response(
//         JSON.stringify({ message: "No scheduled campaigns to process" }),
//         { status: 200 }
//       );
//     }

//     for (const campaign of campaigns) {
//       try {
//         console.log(`⚙️ Processing Campaign: ${campaign._id}`);

//         campaign.status = "Running";
//         await campaign.save();

//         let recipients = [];

//         // SEGMENT LOGIC (DEBUG)
//         if (campaign.recipientSource === "segment") {
//           console.log("📌 Segment source:", campaign.recipientList);

//           const res = await fetch(`${process.env.BASE_URL}/api/lead`);
//           const leads = await res.json();

//           recipients = leads.map((l) => l.email).filter(Boolean);

//           console.log("📌 Resolved recipients:", recipients);
//         }

//         if (campaign.recipientSource === "manual") {
//           recipients = campaign.recipientManual
//             .split(/[\n,]+/)
//             .map((x) => x.trim())
//             .filter(Boolean);

//           console.log("📌 Manual recipients:", recipients);
//         }

//         if (!recipients.length) {
//           console.log("❌ No recipients, marking failed");
//           campaign.status = "Failed";
//           await campaign.save();
//           continue;
//         }

//         // EMAIL SENDING
//         if (campaign.channel === "email") {
//           console.log("📧 Sending Emails...");

//           const transporter = nodemailer.createTransport({
//             service: "gmail",
//             auth: {
//               user: process.env.SMTP_USER,
//               pass: process.env.SMTP_PASS,
//             },
//           });

//           for (const email of recipients) {
//             console.log("📨 Sending email to:", email);

//             await transporter.sendMail({
//               from: campaign.sender,
//               to: email,
//               subject: campaign.emailSubject,
//               html: campaign.content,
//             });
//           }
//         }

//         campaign.status = "Sent";
//         await campaign.save();

//         console.log(`✅ Campaign sent: ${campaign._id}`);

//       } catch (err) {
//         console.error("❌ Campaign Send Error:", err);
//         campaign.status = "Failed";
//         await campaign.save();
//       }
//     }

//     return new Response(JSON.stringify({ success: true }), { status: 200 });

//   } catch (err) {
//     console.error("❌ CRON ERROR:", err);
//     return new Response(JSON.stringify({ error: err.message }), { status: 500 });
//   }
// }
