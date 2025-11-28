import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import EmailCampaign from "@/models/EmailCampaign";

// ✅ Tracking model
import EmailLog from "@/models/EmailLog";

// ✅ Correct Models
import Customer from "@/models/CustomerModel";
import Lead from "@/models/load"; // ✅ FIXED

import nodemailer from "nodemailer";
import fetch from "node-fetch";

// -------------------------
// META WHATSAPP CONFIG
// -------------------------
const META_URL = "https://graph.facebook.com/v18.0";
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const META_TOKEN = process.env.META_WABA_TOKEN;

// -------------------------
// EMAIL CONFIG
// -------------------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

// ✅ EMAIL VALIDATION
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export async function POST(req, context) {
  try {
    await dbConnect();

    // ---------------------
    // AUTH CHECK
    // ---------------------
    const token = getTokenFromHeader(req);
    if (!token)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });

    const decoded = verifyJWT(token);
    if (!decoded?.companyId)
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 403,
      });

    // ✅ FIX FOR NEXT.JS PARAMS
    const { id } = context.params;

    if (!id) {
      return new Response(JSON.stringify({ error: "Campaign ID missing" }), {
        status: 400,
      });
    }

    // ---------------------
    // FETCH CAMPAIGN
    // ---------------------
    const campaign = await EmailCampaign.findById(id);

    if (!campaign)
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
      });

    // ---------------------
    // BUILD RECIPIENTS
    // ---------------------
    let recipients = [];

    // ========= SEGMENT =========
    if (campaign.recipientSource === "segment") {
      if (campaign.recipientList === "source_customers") {
        const customers = await Customer.find(
          { companyId: decoded.companyId },
          "email mobileNo"
        );

        recipients = customers.map((c) =>
          campaign.channel === "email" ? c.email : c.mobileNo
        );
      }

      if (campaign.recipientList === "source_leads") {
        const leads = await Lead.find(
          { companyId: decoded.companyId },
          "email mobileNo"
        );

        recipients = leads.map((l) =>
          campaign.channel === "email" ? l.email : l.mobileNo
        );
      }
    }

    // ========= MANUAL =========
    if (campaign.recipientSource === "manual") {
      recipients = campaign.recipientManual
        ?.split(/[\n,]+/)
        .map((x) => x.trim());
    }

    // ========= EXCEL (NEW, ARRAY FROM FRONTEND) =========
    if (campaign.recipientSource === "excel") {
  if (
    !campaign.recipientExcelEmails ||
    !campaign.recipientExcelEmails.length
  ) {
    return new Response(
      JSON.stringify({ error: "No emails found in Excel" }),
      { status: 400 }
    );
  }

  recipients = campaign.recipientExcelEmails;
}


    if (!recipients.length)
      return new Response(JSON.stringify({ error: "No recipients found" }), {
        status: 400,
      });

    // ✅ CLEAN + VALIDATE EMAILS
    if (campaign.channel === "email") {
      const before = recipients.length;

      recipients = [
        ...new Set(
          recipients
            .map((e) => e?.toLowerCase().trim())
            .filter((e) => isValidEmail(e))
        ),
      ];

      console.log(`📧 Cleaned: ${before} ➝ ${recipients.length}`);

      if (!recipients.length) {
        return new Response(
          JSON.stringify({ error: "No valid emails found after filter" }),
          { status: 400 }
        );
      }
    }

    console.log("📤 Sending to:", recipients);

    // =================================================
    // ✅ EMAIL SEND (WITH TRACKING)
    // =================================================
    if (campaign.channel === "email") {
      for (const email of recipients) {
        const log = await EmailLog.create({
          companyId: decoded.companyId,
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

        const attachmentLink =
          campaign.attachments && campaign.attachments.length > 0
            ? `
              <a href="${BASE_URL}/api/track/attachment?id=${log._id}">
                📎 Download Attachment
              </a>`
            : "";

        const trackedLink = campaign.ctaText
          ? `
              <a href="${BASE_URL}/api/track/link?id=${log._id}&url=https://google.com">
                ${campaign.ctaText}
              </a>`
          : "";

        const finalHtml = `
          <div>
            ${campaign.content}
            <br/><br/>
            ${trackedLink}
            <br/><br/>
            ${attachmentLink}
            ${openPixel}
          </div>
        `;

        await transporter.sendMail({
          from: campaign.sender,
          to: email,
          subject: campaign.emailSubject,
          html: finalHtml,
          attachments: (campaign.attachments || []).map((p) => ({
            path: p,
          })),
        });

        console.log("✅ Email sent with tracking:", email);
      }
    }

    // =================================================
    // ✅ WHATSAPP SEND
    // =================================================
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

    // ---------------------
    // UPDATE CAMPAIGN
    // ---------------------
    campaign.status = "Sent";
    await campaign.save();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Campaign sent successfully ✅",
        totalRecipients: recipients.length,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("SEND ERROR:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}




// import dbConnect from "@/lib/db";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import EmailCampaign from "@/models/EmailCampaign";

// // NEW: Required for segments
// import Customer from "@/models/CustomerModel";
// import Lead from "@/models/load";

// import nodemailer from "nodemailer";


// // -------------------------
// // META WHATSAPP CONFIG
// // -------------------------
// const META_URL = "https://graph.facebook.com/v18.0";
// const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
// const META_TOKEN = process.env.META_WABA_TOKEN;


// // -------------------------
// // EMAIL CONFIG
// // -------------------------
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
// });


// export async function POST(req, { params }) {
//   try {
//     await dbConnect();

//     // ---------------------
//     // AUTH CHECK
//     // ---------------------
//     const token = getTokenFromHeader(req);
//     if (!token)
//       return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

//     const decoded = verifyJWT(token);
//     if (!decoded?.companyId)
//       return new Response(JSON.stringify({ error: "Invalid token" }), { status: 403 });

//     const { id } = params;

//     // ---------------------
//     // FETCH CAMPAIGN
//     // ---------------------
//     const campaign = await EmailCampaign.findById(id);
//     if (!campaign)
//       return new Response(JSON.stringify({ error: "Campaign not found" }), { status: 404 });


//     // ---------------------
//     // REAL SEGMENT LOGIC
//     // ---------------------
//     let recipients = [];

//     if (campaign.recipientSource === "segment") {

//       if (campaign.recipientList === "source_customers") {
//         // 🎯 All customers belonging to logged company
//         const customers = await Customer.find(
//           { companyId: decoded.companyId },
//           "email mobileNo"
//         );

//         recipients = customers
//           .map((c) => c.email || c.mobileNo)
//           .filter(Boolean);

//       } else if (campaign.recipientList === "source_leads") {
//         // 🎯 All leads belonging to company
//         const leads = await Lead.find(
//           { companyId: decoded.companyId },
//           "email mobileNo"
//         );

//         recipients = leads
//           .map((l) => l.email || l.mobileNo)
//           .filter(Boolean);
//       }
//     }


//     // ---------------------
//     // MANUAL ENTRY
//     // ---------------------
//     if (campaign.recipientSource === "manual") {
//       recipients = campaign.recipientManual
//         .split(/[\n,]+/)
//         .map((x) => x.trim())
//         .filter(Boolean);
//     }


//     // ---------------------
//     // EXCEL FILE (Not implemented)
//     // ---------------------
//     if (campaign.recipientSource === "excel") {
//       return new Response(
//         JSON.stringify({ error: "Excel parsing not implemented yet" }),
//         { status: 501 }
//       );
//     }


//     // ---------------------
//     // VALIDATE RECIPIENTS
//     // ---------------------
//     if (!recipients.length)
//       return new Response(JSON.stringify({ error: "No recipients found" }), { status: 400 });

//     console.log("Sending to recipients:", recipients);


//     // ---------------------
//     // SEND EMAILS
//     // ---------------------
//    if (campaign.channel === "email") {
//       for (const email of recipients) {
//         await transporter.sendMail({
//           from: campaign.sender,
//           to: email,
//           subject: campaign.emailSubject,
//           html: campaign.content,
//         });
//       }
//     }


//     // ---------------------
//     // SEND WHATSAPP
//     // ---------------------
//     if (campaign.channel === "whatsapp") {
//       for (const number of recipients) {
//         await fetch(`${META_URL}/${WHATSAPP_PHONE_ID}/messages`, {
//           method: "POST",
//           headers: {
//             Authorization: `Bearer ${META_TOKEN}`,
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({
//             messaging_product: "whatsapp",
//             to: number,
//             type: "text",
//             text: { body: campaign.content },
//           }),
//         });
//       }
//     }


//     // ---------------------
//     // UPDATE CAMPAIGN STATUS
//     // ---------------------
//     campaign.status = "Sent";
//     await campaign.save();


//     return new Response(
//       JSON.stringify({
//         success: true,
//         message: "Campaign sent successfully",
//         recipients,
//         data: campaign,
//       }),
//       { status: 200 }
//     );


//   } catch (err) {
//     console.error("SEND ERROR:", err);
//     return new Response(
//       JSON.stringify({ success: false, error: err.message }),
//       { status: 500 }
//     );
//   }
// }
