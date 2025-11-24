export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import EmailCampaign from "@/models/EmailCampaign";
import Lead from "@/models/load";
import Customer from "@/models/CustomerModel";
import nodemailer from "nodemailer";
import * as XLSX from "xlsx";

import path from "path";
import fs from "fs";

// WhatsApp API
const META_URL = "https://graph.facebook.com/v18.0";
const WHATSAPP_PHONE_ID = process.env.PHONE_NUMBER_ID;
const META_TOKEN = process.env.WHATSAPP_TOKEN;

// Email Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function GET() {
  console.log("🚀 CRON HIT:", new Date().toISOString());

  try {
    await dbConnect();
    const now = new Date();

    // Fetch campaigns whose schedule time has arrived
    const campaigns = await EmailCampaign.find({
      status: "Scheduled",
      scheduledTime: { $lte: now },
    });

    console.log(`📌 Found ${campaigns.length} ready campaigns`);

    if (campaigns.length === 0) {
      return new Response(
        JSON.stringify({ message: "No scheduled campaigns right now" }),
        { status: 200 }
      );
    }

    // -------------------------------
    // PROCESS CAMPAIGNS
    // -------------------------------
    for (const campaign of campaigns) {
      try {
        console.log(`⚙️ Running Campaign: ${campaign._id}`);

        campaign.status = "Running";
        await campaign.save();

        let recipients = [];

        // -------------------------------------------------------------------
        // 1️⃣ SEGMENT AUDIENCE (REAL DATABASE QUERY NOW)
        // -------------------------------------------------------------------
        if (campaign.recipientSource === "segment") {
          if (campaign.recipientList === "source_leads") {
            const leads = await Lead.find({
              companyId: campaign.companyId,
            });

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

        // -------------------------------------------------------------------
        // 2️⃣ MANUAL ENTRY AUDIENCE
        // -------------------------------------------------------------------
        if (campaign.recipientSource === "manual") {
          recipients = campaign.recipientManual
            .split(/[\n,]+/)
            .map((x) => x.trim())
            .filter(Boolean);
        }

        // -------------------------------------------------------------------
        // 3️⃣ EXCEL UPLOAD AUDIENCE
        // -------------------------------------------------------------------
// EXCEL AUDIENCE
if (campaign.recipientSource === "excel") {
  try {
    const filename = path.basename(campaign.recipientExcelPath);

    // 🔥 Correct root folder
    const excelPath = path.join(process.cwd(), "uploads", filename);

    console.log("📁 Reading Excel:", excelPath);
    console.log("📁 Exists:", fs.existsSync(excelPath));

    if (!fs.existsSync(excelPath)) {
      throw new Error("File not found at: " + excelPath);
    }

    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    recipients = rows
      .map((r) => r.email || r.phone || r.number)
      .filter(Boolean);

  } catch (excelErr) {
    console.error("❌ Excel Read Error:", excelErr);
    campaign.status = "Failed";
    await campaign.save();
    continue;
  }
}



        // -------------------------------------------------------------------
        // 4️⃣ FORMAT WHATSAPP NUMBERS (AUTO +91)
        // -------------------------------------------------------------------
        if (campaign.channel === "whatsapp") {
          recipients = recipients
            .map((n) => {
              if (!n) return null;

              n = n.toString().replace(/\D/g, ""); // remove non-digits

              if (n.startsWith("91")) return n;
              if (n.startsWith("0")) return "91" + n.slice(1);

              return "91" + n;
            })
            .filter(Boolean);
        }

        console.log("📌 Final Recipients:", recipients);

        if (!recipients.length) {
          console.log("❌ No recipients → Failed");
          campaign.status = "Failed";
          await campaign.save();
          continue;
        }

        // -------------------------------------------------------------------
        // 5️⃣ SEND EMAIL CAMPAIGN
        // -------------------------------------------------------------------
        if (campaign.channel === "email") {
          console.log("📧 Sending Email blast...");

          for (const email of recipients) {
            await transporter.sendMail({
              from: campaign.sender,
              to: email,
              subject: campaign.emailSubject,
              html: campaign.content,
            });
          }
        }

        // -------------------------------------------------------------------
        // 6️⃣ SEND WHATSAPP CAMPAIGN
        // -------------------------------------------------------------------
        if (campaign.channel === "whatsapp") {
          console.log("💬 Sending WhatsApp messages...");

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
          }
        }

        // -------------------------------------------------------------------
        // 7️⃣ MARK AS SENT
        // -------------------------------------------------------------------
        campaign.status = "Sent";
        await campaign.save();

        console.log(`✅ Campaign Sent: ${campaign._id}`);

      } catch (err) {
        console.error("❌ Campaign Failed:", err);
        campaign.status = "Failed";
        await campaign.save();
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err) {
    console.error("❌ CRON ERROR:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
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
