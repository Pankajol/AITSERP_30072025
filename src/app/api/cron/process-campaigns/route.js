import dbConnect from "@/lib/db";
import EmailLog from "@/models/EmailLog";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return new Response("Missing ID", { status: 400 });
    }

    const log = await EmailLog.findById(id);

    if (log) {
      log.isOpened = true;
      log.openCount = (log.openCount || 0) + 1;
      log.lastOpenedAt = new Date();

      if (!log.firstOpenedAt) {
        log.firstOpenedAt = new Date();
      }

      log.ip =
        req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown";

      await log.save();
    }

    // ✅ REAL 1x1 TRANSPARENT GIF
    const pixel = Buffer.from(
      "R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=",
      "base64"
    );

    return new Response(pixel, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Content-Length": pixel.length,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });

  } catch (err) {
    console.error("TRACKING ERROR", err);

    const pixel = Buffer.from(
      "R0lGODlhAQABAIABAP///wAAACwAAAAAAQABAAACAkQBADs=",
      "base64"
    );

    return new Response(pixel, {
      status: 200,
      headers: { "Content-Type": "image/gif" },
    });
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
