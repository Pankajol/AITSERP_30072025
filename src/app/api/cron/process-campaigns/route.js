// app/api/cron/send-campaigns/route.js  (replace your existing file)
export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import EmailCampaign from "@/models/EmailCampaign";
import Lead from "@/models/load"; // adjust if your file name is different (you earlier used load / load typo)
import Customer from "@/models/CustomerModel";
import EmailLog from "@/models/EmailLog";
import EmailMaster from "@/models/emailMaster/emailMaster";

import nodemailer from "nodemailer";
import crypto from "crypto";

// =====================
// WHATSAPP CONFIG
// =====================
const META_URL = "https://graph.facebook.com/v18.0";
const WHATSAPP_PHONE_ID = process.env.PHONE_NUMBER_ID;
const META_TOKEN = process.env.WHATSAPP_TOKEN;

// =====================
// UTIL: email validator
// =====================
const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").toString().trim());

// =====================
// UTIL: decryption helper
// =====================
// Assumptions:
// - process.env.EMAIL_MASTER_SECRET is provided (a secret string)
// - encryptedAppPassword in DB is stored as either:
//    1) base64 of (iv + ciphertext)  OR
//    2) a string like "ivHex:cipherHex"  OR
//    3) base64 of "iv:ciphertext" (rare)
// The function tries to handle common variants.
// If decryption fails, function returns null so caller can fallback to env SMTP_PASS.
function tryDecryptEncryptedPassword(encrypted) {
  if (!encrypted) return null;
  const secret = process.env.EMAIL_MASTER_SECRET;
  if (!secret) {
    console.warn("EMAIL_MASTER_SECRET not set — can't decrypt EmailMaster.encryptedAppPassword");
    return null;
  }

  try {
    // Normalize input
    let ivBuf = null;
    let cipherBuf = null;

    // If stored as "ivHex:cipherHex"
    if (typeof encrypted === "string" && encrypted.includes(":")) {
      const [a, b] = encrypted.split(":");
      // detect hex vs base64
      const isHex = /^[0-9a-fA-F]+$/.test(a) && /^[0-9a-fA-F]+$/.test(b);
      if (isHex) {
        ivBuf = Buffer.from(a, "hex");
        cipherBuf = Buffer.from(b, "hex");
      } else {
        // maybe base64: base64(iv)+":"+base64(cipher)
        try {
          ivBuf = Buffer.from(a, "base64");
          cipherBuf = Buffer.from(b, "base64");
        } catch (e) {
          // fallthrough
        }
      }
    }

    // If it's base64 of iv+ciphertext (common)
    if (!ivBuf) {
      try {
        const all = Buffer.from(encrypted, "base64");
        // assume iv is first 16 bytes
        if (all.length > 16) {
          ivBuf = all.slice(0, 16);
          cipherBuf = all.slice(16);
        }
      } catch (e) {
        // not base64 or failed; continue
      }
    }

    // if still not set, maybe it's hex of iv+cipher
    if (!ivBuf) {
      try {
        const allHex = Buffer.from(encrypted, "hex");
        if (allHex.length > 16) {
          ivBuf = allHex.slice(0, 16);
          cipherBuf = allHex.slice(16);
        }
      } catch (e) {
        // ignore
      }
    }

    if (!ivBuf || !cipherBuf) {
      console.warn("Could not parse encryptedAppPassword format for decryption.");
      return null;
    }

    // derive key from secret (32 bytes)
    const key = crypto.createHash("sha256").update(secret).digest();
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, ivBuf);
    let decrypted = decipher.update(cipherBuf, undefined, "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.warn("Decrypt failed:", err && err.message);
    return null;
  }
}

// =====================
// Build transporter from EmailMaster record (uses decrypted password)
// =====================
async function buildTransporterFromEmailMaster(emailMaster) {
  // If no emailMaster provided, fallback to env later (caller handles)
  if (!emailMaster) return null;

  // use emailMaster.email as user if present
  const user = emailMaster.email || process.env.SMTP_USER || null;

  // try decrypt
  let pass = null;
  if (emailMaster.encryptedAppPassword) {
    pass = tryDecryptEncryptedPassword(emailMaster.encryptedAppPassword);
    if (!pass) {
      console.warn("Failed to decrypt EmailMaster.encryptedAppPassword — falling back to process.env.SMTP_PASS if present");
    }
  }

  // if decrypt didn't work and maskedAppPassword exists (not usable), fallback to env
  if (!pass) {
    pass = process.env.SMTP_PASS || null;
  }

  // NOTE: EmailMaster.schema doesn't provide host/port fields.
  // We'll handle common services via 'service' field:
  // - 'gmail' => nodemailer service 'gmail'
  // - 'outlook' => service 'hotmail' (nodemailer uses 'hotmail' for outlook/office365)
  // - 'custom' => not supported by schema (no host/port). Return null so caller can fallback to env or use global transporter.
  const service = (emailMaster.service || "gmail").toLowerCase();

  if (!user || !pass) {
    console.warn("Missing smtp user or pass for EmailMaster, cannot build transporter from EmailMaster.");
    return null;
  }

  if (service === "gmail") {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  if (service === "outlook" || service === "hotmail") {
    return nodemailer.createTransport({
      service: "hotmail",
      auth: { user, pass },
    });
  }

  // for 'custom' or unknown service we cannot build transporter because schema lacks host/port fields
  console.warn("EmailMaster.service is custom/unknown and EmailMaster has no host/port fields. Returning null to let caller fallback.");
  return null;
}

// small helper to format From header (Name <email>)
function formatFrom(name, email) {
  if (!email) return name || process.env.SMTP_USER || "no-reply@example.com";
  if (!name) return email;
  return `${name} <${email}>`;
}

// final fallback transporter using env vars
function buildTransporterFromEnv() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return null;
}

// =====================
// MAIN CRON
// =====================
export async function GET() {
  try {
    console.log("\n🚀 CRON HIT:", new Date().toISOString());
    await dbConnect();

    const now = new Date();
    console.log("⏰ CURRENT UTC:", now.toISOString());

    const campaigns = await EmailCampaign.find({
      status: "Scheduled",
      scheduledTime: { $lte: new Date() },
    });

    console.log(`📌 Ready campaigns: ${campaigns.length}`);

    let processed = 0;

    for (const campaign of campaigns) {
      try {
        console.log("\n⚙️ Running Campaign:", campaign.campaignName || campaign._id);
        campaign.status = "Running";
        await campaign.save();

        let recipients = [];

        // ---- Expand recipients from segment
        if (campaign.recipientSource === "segment") {
          const listKey = campaign.recipientList || campaign.recipients || campaign.recipientsList;
          const which = listKey || campaign.recipientList;

          if (which === "source_leads" || campaign.recipientList === "source_leads") {
            const leads = await Lead.find({ companyId: campaign.companyId });
            recipients = leads.map((l) => (campaign.channel === "email" ? (l.email || l.emailId) : l.mobileNo)).filter(Boolean);
          } else if (which === "source_customers" || campaign.recipientList === "source_customers") {
            const customers = await Customer.find({ companyId: campaign.companyId });
            recipients = customers.map((c) => (campaign.channel === "email" ? (c.email || c.emailId) : c.mobileNo)).filter(Boolean);
          } else if (Array.isArray(campaign.recipients) && campaign.recipients.length) {
            recipients = campaign.recipients;
          }
        }

        // manual
        if (campaign.recipientSource === "manual") {
          const manual = campaign.recipientManual || campaign.recipients || "";
          recipients = (manual || "")
            .toString()
            .split(/[\n,]+/)
            .map((x) => x.trim())
            .filter(Boolean);
        }

        // excel (frontend parsed saved as array)
        if (campaign.recipientSource === "excel") {
          const excelEmails = campaign.recipientExcelEmails || campaign.recipients || [];
          recipients = excelEmails && excelEmails.length ? excelEmails : [];
        }

        // clean
        if (campaign.channel === "email") {
          const before = recipients.length;
          recipients = [
            ...new Set(
              (recipients || [])
                .map((e) => e?.toString().trim().toLowerCase())
                .filter((e) => isValidEmail(e))
            ),
          ];
          console.log(`📧 Emails cleaned: ${before} → ${recipients.length} valid`);
        } else if (campaign.channel === "whatsapp") {
          recipients = (recipients || [])
            .map((n) => {
              if (!n) return null;
              n = n.toString().replace(/\D/g, "");
              if (n.startsWith("91")) return n;
              if (n.startsWith("0")) return "91" + n.substring(1);
              return "91" + n;
            })
            .filter(Boolean);
        }

        if (!recipients || recipients.length === 0) {
          console.log("❌ No valid recipients found - marking campaign Failed");
          campaign.status = "Failed";
          await campaign.save();
          continue;
        }

        console.log("📨 Final recipients:", recipients.length);

        // ---- Load EmailMaster (if provided) or company's default
        let emailMaster = null;
        if (campaign.emailMasterId) {
          try {
            emailMaster = await EmailMaster.findById(campaign.emailMasterId).lean();
          } catch (er) {
            console.warn("EmailMaster fetch failed:", er && er.message);
            emailMaster = null;
          }
        }
        if (!emailMaster && campaign.companyId) {
          emailMaster = await EmailMaster.findOne({ companyId: campaign.companyId, status: "Active" }).lean();
        }

        // Try building transporter from EmailMaster first, then fallback to env
        let transporter = await buildTransporterFromEmailMaster(emailMaster);
        if (!transporter) {
          transporter = buildTransporterFromEnv();
        }
        if (!transporter) {
          console.error("❌ No transporter available. Set EMAIL_MASTER_SECRET and/or SMTP env vars.");
          campaign.status = "Failed";
          await campaign.save();
          continue;
        }

        // determine From header
        const fromEmail =
          (emailMaster && (emailMaster.email || emailMaster.recoveryEmail)) ||
          process.env.SMTP_USER ||
          campaign.sender ||
          "no-reply@example.com";
        const fromName = (emailMaster && (emailMaster.owner || emailMaster.purpose)) || campaign.sender || "";
        const fromHeader = formatFrom(fromName, fromEmail);

        // Send emails sequentially (simple) — consider batching / concurrency for large lists
        if (campaign.channel === "email") {
          const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "";

          for (const toEmail of recipients) {
            const log = await EmailLog.create({
              companyId: campaign.companyId,
              campaignId: campaign._id,
              to: toEmail,
              templateId: campaign.templateId || null,
              emailMasterId: (emailMaster && emailMaster._id) || null,
              status: "sending",
            });

            const openPixel = BASE_URL
              ? `<img src="${BASE_URL.replace(/\/$/, "")}/api/track/email-open?id=${log._id}" width="1" height="1" style="display:none;" />`
              : "";

            const finalHtml = `
              <div>
                ${campaign.content || campaign.emailBody || ""}
                <br/><br/>
                ${openPixel}
              </div>
            `;

            try {
              await transporter.sendMail({
                from: fromHeader,
                to: toEmail,
                subject: campaign.emailSubject || campaign.subject || "(no subject)",
                html: finalHtml,
              });

              log.status = "sent";
              log.sentAt = new Date();
              await log.save();

              console.log("✅ Email sent:", toEmail);
            } catch (sendErr) {
              console.error("❌ Send error for", toEmail, sendErr && sendErr.message);
              log.status = "failed";
              log.error = (sendErr && sendErr.message) || String(sendErr);
              await log.save();
              continue;
            }
          }
        }

        // WhatsApp
        if (campaign.channel === "whatsapp") {
          for (const number of recipients) {
            try {
              const resp = await fetch(`${META_URL}/${WHATSAPP_PHONE_ID}/messages`, {
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

              if (!resp.ok) {
                const txt = await resp.text();
                console.warn("WhatsApp API non-OK response:", resp.status, txt);
              } else {
                console.log("✅ WhatsApp sent:", number);
              }
            } catch (waErr) {
              console.error("❌ WhatsApp error for", number, waErr && waErr.message);
            }
          }
        }

        campaign.status = "Sent";
        campaign.sentAt = new Date();
        await campaign.save();

        console.log("✅ FINISHED:", campaign.campaignName || campaign._id);
        processed++;
      } catch (innerErr) {
        console.error("❌ Campaign error:", innerErr && innerErr.message);
        try {
          campaign.status = "Failed";
          await campaign.save();
        } catch (saveErr) {
          console.error("❌ Failed to set campaign Failed status:", saveErr && saveErr.message);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, total: campaigns.length, processed, time: now }), { status: 200 });
  } catch (err) {
    console.error("❌ CRON ERROR:", err && err.message);
    return new Response(JSON.stringify({ success: false, error: err && err.message }), { status: 500 });
  }
}



// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import EmailCampaign from "@/models/EmailCampaign";
// import Lead from "@/models/load"; // ✅ FIXED
// import Customer from "@/models/CustomerModel";
// import EmailLog from "@/models/EmailLog";

// import nodemailer from "nodemailer";

// // =====================
// // WHATSAPP CONFIG
// // =====================
// const META_URL = "https://graph.facebook.com/v18.0";
// const WHATSAPP_PHONE_ID = process.env.PHONE_NUMBER_ID;
// const META_TOKEN = process.env.WHATSAPP_TOKEN;

// // =====================
// // EMAIL CONFIG
// // =====================
// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASS,
//   },
// });

// // ✅ EMAIL VALIDATOR
// const isValidEmail = (email) => {
//   return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
// };

// // =====================
// // MAIN CRON
// // =====================
// export async function GET() {
//   try {
//     console.log("\n🚀 CRON HIT:", new Date().toISOString());

//     await dbConnect();

//     const now = new Date();
//     console.log("⏰ CURRENT UTC:", now.toISOString());

//     const campaigns = await EmailCampaign.find({
//       status: "Scheduled",
//       scheduledTime: { $lte: new Date() },
//     });

//     console.log(`📌 Ready campaigns: ${campaigns.length}`);

//     let processed = 0;

//     for (const campaign of campaigns) {
//       try {
//         console.log("\n⚙️ Running Campaign:", campaign.campaignName);

//         campaign.status = "Running";
//         await campaign.save();

//         let recipients = [];

//         // ================= SEGMENT =================
//         if (campaign.recipientSource === "segment") {
//           if (campaign.recipientList === "source_leads") {
//             const leads = await Lead.find({ companyId: campaign.companyId });

//             recipients = leads
//               .map((l) =>
//                 campaign.channel === "email" ? l.email : l.mobileNo
//               )
//               .filter(Boolean);
//           }

//           if (campaign.recipientList === "source_customers") {
//             const customers = await Customer.find({
//               companyId: campaign.companyId,
//             });

//             recipients = customers
//               .map((c) =>
//                 campaign.channel === "email" ? c.email : c.mobileNo
//               )
//               .filter(Boolean);
//           }
//         }

//         // ================= MANUAL =================
//         if (campaign.recipientSource === "manual") {
//           recipients = campaign.recipientManual
//             ?.split(/[\n,]+/)
//             .map((x) => x.trim())
//             .filter(Boolean);
//         }

//         // ================= EXCEL (FROM FRONTEND ARRAY) =================
//        if (campaign.recipientSource === "excel") {
//   if (
//     !campaign.recipientExcelEmails ||
//     !campaign.recipientExcelEmails.length
//   ) {
//     return new Response(
//       JSON.stringify({ error: "No emails found in Excel" }),
//       { status: 400 }
//     );
//   }

//   recipients = campaign.recipientExcelEmails;
// }


//         // ✅ FILTER VALID EMAILS (FOR EMAIL CAMPAIGNS)
//         if (campaign.channel === "email") {
//           const before = recipients.length;

//           recipients = [
//             ...new Set(
//               recipients
//                 .map((e) => e?.toString().trim().toLowerCase())
//                 .filter((e) => isValidEmail(e))
//             ),
//           ];

//           console.log(
//             `📧 Emails cleaned: ${before} → ${recipients.length} valid`
//           );
//         }

//         // ✅ FORMAT WHATSAPP NUMBERS
//         if (campaign.channel === "whatsapp") {
//           recipients = recipients
//             .map((n) => {
//               if (!n) return null;
//               n = n.toString().replace(/\D/g, "");

//               if (n.startsWith("91")) return n;
//               if (n.startsWith("0")) return "91" + n.substring(1);

//               return "91" + n;
//             })
//             .filter(Boolean);
//         }

//         if (!recipients.length) {
//           console.log("❌ No valid recipients found");
//           campaign.status = "Failed";
//           await campaign.save();
//           continue;
//         }

//         console.log("📨 Final recipients:", recipients.length);

//         // ================= EMAIL SENDING =================
//         if (campaign.channel === "email") {
//           const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

//           for (const email of recipients) {
//             const log = await EmailLog.create({
//               companyId: campaign.companyId,
//               campaignId: campaign._id,
//               to: email,
//             });

//             const openPixel = `
//               <img
//                 src="${BASE_URL}/api/track/email-open?id=${log._id}"
//                 width="1"
//                 height="1"
//                 style="display:none;"
//               />
//             `;

//             const finalHtml = `
//               <div>
//                 ${campaign.content}
//                 <br/><br/>
//                 ${openPixel}
//               </div>
//             `;

//             await transporter.sendMail({
//               from: campaign.sender,
//               to: email,
//               subject: campaign.emailSubject,
//               html: finalHtml,
//             });

//             console.log("✅ Email sent:", email);
//           }
//         }

//         // ================= WHATSAPP SENDING =================
//         if (campaign.channel === "whatsapp") {
//           for (const number of recipients) {
//             await fetch(`${META_URL}/${WHATSAPP_PHONE_ID}/messages`, {
//               method: "POST",
//               headers: {
//                 Authorization: `Bearer ${META_TOKEN}`,
//                 "Content-Type": "application/json",
//               },
//               body: JSON.stringify({
//                 messaging_product: "whatsapp",
//                 to: number,
//                 type: "text",
//                 text: { body: campaign.content },
//               }),
//             });

//             console.log("✅ WhatsApp sent:", number);
//           }
//         }

//         campaign.status = "Sent";
//         await campaign.save();

//         console.log("✅ FINISHED:", campaign.campaignName);
//         processed++;

//       } catch (innerErr) {
//         console.error("❌ Campaign error:", innerErr);
//         campaign.status = "Failed";
//         await campaign.save();
//       }
//     }

//     return new Response(
//       JSON.stringify({
//         success: true,
//         total: campaigns.length,
//         processed,
//         time: now,
//       }),
//       { status: 200 }
//     );

//   } catch (err) {
//     console.error("❌ CRON ERROR:", err);
//     return new Response(
//       JSON.stringify({ success: false, error: err.message }),
//       { status: 500 }
//     );
//   }
// }




