export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import EmailCampaign from "@/models/EmailCampaign";
import EmailLog from "@/models/EmailLog";
import Customer from "@/models/CustomerModel";
import Lead from "@/models/load"; 
import EmailMaster from "@/models/emailMaster/emailMaster";

import nodemailer from "nodemailer";
import fetch from "node-fetch"; 
import crypto from "crypto";

// -------------------------
// CONFIGS
// -------------------------
const META_URL = "https://graph.facebook.com/v18.0";
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const META_TOKEN = process.env.META_WABA_TOKEN;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "";

// -------------------------
// Helpers
// -------------------------
const isValidEmail = (email) =>
  typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

function tryDecryptEncryptedPassword(encrypted) {
  if (!encrypted) return null;
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) return null;

  try {
    let ivBuf, cipherBuf;
    if (typeof encrypted === "string" && encrypted.includes(":")) {
      const [a, b] = encrypted.split(":");
      ivBuf = Buffer.from(a, "hex");
      cipherBuf = Buffer.from(b, "hex");
    } else {
      const all = Buffer.from(encrypted, "base64");
      ivBuf = all.slice(0, 16);
      cipherBuf = all.slice(16);
    }

    const key = crypto.createHash("sha256").update(secret).digest();
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, ivBuf);
    let decrypted = decipher.update(cipherBuf, undefined, "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    return null;
  }
}

async function buildTransporterForEmailMaster(emailMaster) {
  if (!emailMaster) return null;
  const user = emailMaster.email;
  const pass = emailMaster.encryptedAppPassword ? tryDecryptEncryptedPassword(emailMaster.encryptedAppPassword) : null;

  if (!user || !pass) return null;
  const service = (emailMaster.service || "").toLowerCase();

  if (service === "gmail") {
    return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  }
  if (["outlook", "office365", "hotmail"].includes(service)) {
    return nodemailer.createTransport({
      host: "smtp.office365.com",
      port: 587,
      secure: false,
      auth: { user, pass },
      requireTLS: true,
      tls: { rejectUnauthorized: false },
    });
  }
  return null;
}

function buildTransporterFromEnv() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({ service: "gmail", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
  }
  return null;
}

function formatFrom(name, email) {
  if (!email) return name || "no-reply@example.com";
  return name ? `${name} <${email}>` : email;
}

// -------------------------
// POST Handler
// -------------------------
export async function POST(req, context) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token) return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded?.companyId) return new Response(JSON.stringify({ success: false, error: "Invalid token" }), { status: 403 });

    const id = context?.params?.id;
    const campaign = await EmailCampaign.findById(id);
    if (!campaign) return new Response(JSON.stringify({ success: false, error: "Not found" }), { status: 404 });

    // Build Recipients
    let recipients = [];
    if (campaign.recipientSource === "segment") {
      const Model = campaign.recipientList === "source_customers" ? Customer : Lead;
      const data = await Model.find({ companyId: decoded.companyId }, "email mobileNo");
      recipients = data.map(d => campaign.channel === "email" ? d.email : d.mobileNo).filter(Boolean);
    } else if (campaign.recipientSource === "manual") {
      recipients = (campaign.recipientManual || "").split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
    } else if (campaign.recipientSource === "excel") {
      recipients = campaign.recipientExcelEmails || campaign.recipients || [];
    }

    // Clean Recipients
    if (campaign.channel === "email") {
      recipients = [...new Set(recipients.map(e => e.toLowerCase().trim()).filter(isValidEmail))];
    } else {
      recipients = recipients.map(n => {
        let num = n.toString().replace(/\D/g, "");
        return num.startsWith("91") ? num : "91" + num.replace(/^0/, "");
      }).filter(Boolean);
    }

    if (!recipients.length) return new Response(JSON.stringify({ success: false, error: "No recipients" }), { status: 400 });

    // Setup Transporter
    let emailMaster = await EmailMaster.findById(campaign.emailMasterId).lean() || 
                       await EmailMaster.findOne({ companyId: campaign.companyId, status: "Active" }).lean();
    
    let transporter = (await buildTransporterForEmailMaster(emailMaster)) || buildTransporterFromEnv();
    if (!transporter && campaign.channel === "email") {
      return new Response(JSON.stringify({ success: false, error: "SMTP config missing" }), { status: 500 });
    }

    const fromEmail = emailMaster?.email || process.env.SMTP_USER || "no-reply@example.com";
    const fromName = emailMaster?.owner || campaign.sender || "";
    const fromHeader = formatFrom(fromName, fromEmail);

    // SEND EMAILS
    if (campaign.channel === "email") {
      for (const to of recipients) {
        const log = await EmailLog.create({
          companyId: campaign.companyId,
          campaignId: campaign._id,
          to,
          status: "sending",
          emailMasterId: emailMaster?._id || null,
        });

        // 1. CTA Link Setup
        let targetUrl = campaign.ctaLink || "";
        if (targetUrl && !targetUrl.startsWith("http")) targetUrl = "https://" + targetUrl;

        const trackedLink = campaign.ctaText 
          ? `<a href="${BASE_URL}/api/track/link?logId=${log._id}&url=${encodeURIComponent(targetUrl)}" 
                style="display:inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                ${campaign.ctaText}
             </a>` : "";

        const openPixel = `<img src="${BASE_URL}/api/track/email-open?id=${log._id}" width="1" height="1" style="display:none;" />`;

        const finalHtml = `<div>${campaign.content || ""}<br/><br/>${trackedLink}<br/><br/>${openPixel}</div>`;

        try {
          await transporter.sendMail({
            from: fromHeader,
            to,
            subject: campaign.emailSubject || "(no subject)",
            html: finalHtml,
            // 2. Attachments Fix
            attachments: (campaign.attachments || []).map(p => ({
              filename: p.split('/').pop(),
              path: p
            })),
          });
          log.status = "sent";
          log.sentAt = new Date();
          await log.save();
        } catch (err) {
          log.status = "failed";
          log.error = err.message;
          await log.save();
        }
      }
    }

    // SEND WHATSAPP
    if (campaign.channel === "whatsapp") {
      for (const num of recipients) {
        await fetch(`${META_URL}/${WHATSAPP_PHONE_ID}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${META_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messaging_product: "whatsapp", to: num, type: "text", text: { body: campaign.content } }),
        });
      }
    }

    campaign.status = "Sent";
    campaign.sentAt = new Date();
    await campaign.save();

    return new Response(JSON.stringify({ success: true, total: recipients.length }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}



// // app/api/campaigns/[id]/send/route.js
// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import EmailCampaign from "@/models/EmailCampaign";
// import EmailLog from "@/models/EmailLog";
// import Customer from "@/models/CustomerModel";
// import Lead from "@/models/load"; // adjust if your model file name differs
// import EmailMaster from "@/models/emailMaster/emailMaster";

// import nodemailer from "nodemailer";
// import fetch from "node-fetch"; // ok to keep if your Node needs it
// import crypto from "crypto";

// // -------------------------
// // META WHATSAPP CONFIG
// // -------------------------
// const META_URL = "https://graph.facebook.com/v18.0";
// const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
// const META_TOKEN = process.env.META_WABA_TOKEN;

// // -------------------------
// // BASE URL
// // -------------------------
// const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "";

// // -------------------------
// // Email validator
// // -------------------------
// const isValidEmail = (email) =>
//   typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

// // -------------------------
// // Decrypt helper (same logic as earlier)
// // -------------------------
// function tryDecryptEncryptedPassword(encrypted) {
//   if (!encrypted) return null;
//   const secret = process.env.ENCRYPTION_KEY;
//   if (!secret) {
//     console.warn("EMAIL_MASTER_SECRET not set — can't decrypt EmailMaster.encryptedAppPassword");
//     return null;
//   }

//   try {
//     let ivBuf = null;
//     let cipherBuf = null;

//     if (typeof encrypted === "string" && encrypted.includes(":")) {
//       const [a, b] = encrypted.split(":");
//       const isHex = /^[0-9a-fA-F]+$/.test(a) && /^[0-9a-fA-F]+$/.test(b);
//       if (isHex) {
//         ivBuf = Buffer.from(a, "hex");
//         cipherBuf = Buffer.from(b, "hex");
//       } else {
//         try {
//           ivBuf = Buffer.from(a, "base64");
//           cipherBuf = Buffer.from(b, "base64");
//         } catch (e) {}
//       }
//     }

//     if (!ivBuf) {
//       try {
//         const all = Buffer.from(encrypted, "base64");
//         if (all.length > 16) {
//           ivBuf = all.slice(0, 16);
//           cipherBuf = all.slice(16);
//         }
//       } catch (e) {}
//     }

//     if (!ivBuf) {
//       try {
//         const allHex = Buffer.from(encrypted, "hex");
//         if (allHex.length > 16) {
//           ivBuf = allHex.slice(0, 16);
//           cipherBuf = allHex.slice(16);
//         }
//       } catch (e) {}
//     }

//     if (!ivBuf || !cipherBuf) {
//       console.warn("Could not parse encryptedAppPassword for decryption.");
//       return null;
//     }

//     const key = crypto.createHash("sha256").update(secret).digest();
//     const decipher = crypto.createDecipheriv("aes-256-cbc", key, ivBuf);
//     let decrypted = decipher.update(cipherBuf, undefined, "utf8");
//     decrypted += decipher.final("utf8");
//     return decrypted;
//   } catch (err) {
//     console.warn("Decrypt failed:", err && err.message);
//     return null;
//   }
// }

// // -------------------------
// // Build transporter helper
// // -------------------------

// // -------------------------
// // Build transporter ONLY from EmailMaster
// // NO ENV fallback
// // -------------------------
// async function buildTransporterForEmailMaster(emailMaster) {
//   if (!emailMaster) {
//     console.error("❌ EmailMaster missing");
//     return null;
//   }

//   const user = emailMaster.email;
//   if (!user) {
//     console.error("❌ EmailMaster.email missing");
//     return null;
//   }

//   let pass = null;
//   if (emailMaster.encryptedAppPassword) {
//     pass = tryDecryptEncryptedPassword(emailMaster.encryptedAppPassword);
//   }
//   console.log("SMTP USER:", user)
// console.log("SMTP PASS:", pass)

//   if (!pass) {
//     console.error("❌ Cannot decrypt encryptedAppPassword. Stopping here.");
//     return null;
//   }

//   const service = (emailMaster.service || "").toLowerCase();

//   // Gmail
//   if (service === "gmail") {
//     return nodemailer.createTransport({
//       service: "gmail",
//       auth: { user, pass }
//     });
//   }

//   // Outlook/Office365
//   if (service === "outlook" || service === "office365" || service === "hotmail") {
//     return nodemailer.createTransport({
//       host: "smtp.office365.com",
//       port: 587,
//       secure: false,
//       auth: { user, pass },
//       requireTLS: true,
//       tls: { rejectUnauthorized: false },
//     });
//   }

//   console.error("❌ Unsupported service in EmailMaster:", service);
//   return null;
// }



// // async function buildTransporterForEmailMaster(emailMaster) {
// //   if (!emailMaster) return null;

// //   const user = emailMaster.email || process.env.SMTP_USER || null;
// //   let pass = null;

// //   if (emailMaster.encryptedAppPassword) {
// //     pass = tryDecryptEncryptedPassword(emailMaster.encryptedAppPassword);
// //     if (!pass) console.warn("Could not decrypt EmailMaster.encryptedAppPassword — fallback to env if available");
// //   }

// //   if (!pass) pass = process.env.SMTP_PASS || null;

// //   const service = (emailMaster.service || "gmail").toLowerCase();

// //   if (!user || !pass) {
// //     console.warn("Missing smtp user/pass for EmailMaster");
// //     return null;
// //   }

// //   if (service === "gmail") {
// //     return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
// //   }
// //   if (service === "outlook" || service === "office365" || service === "hotmail") {
// //   return nodemailer.createTransport({
// //   host: "smtp.office365.com",
// //   port: 587,
// //   secure: false,
// //   auth: {
// //     user: emailMaster.email,
// //     pass: decryptedPassword // ya app password
// //   },
// //   requireTLS: true,
// //   tls: {
// //     ciphers: "SSLv3"
// //   }
// // });

// // }


// //   console.warn("EmailMaster.service is custom/unsupported (schema lacks host/port). Falling back to env transporter if available.");
// //   return null;
// // }

// function buildTransporterFromEnv() {
//   if (process.env.SMTP_USER && process.env.SMTP_PASS) {
//     return nodemailer.createTransport({ service: "gmail", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
//   }
//   return null;
// }

// function formatFrom(name, email) {
//   if (!email) return name || process.env.SMTP_USER || "no-reply@example.com";
//   if (!name) return email;
//   return `${name} <${email}>`;
// }

// // -------------------------
// // main handler
// // -------------------------
// export async function POST(req, context) {
//   try {
//     await dbConnect();

//     // token
//     const token = getTokenFromHeader(req);
//     if (!token) return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 });

//     let decoded;
//     try {
//       decoded = verifyJWT(token);
//     } catch (err) {
//       console.warn("verifyJWT failed:", err && err.message);
//       return new Response(JSON.stringify({ success: false, error: "Invalid token" }), { status: 401 });
//     }
//     if (!decoded?.companyId) return new Response(JSON.stringify({ success: false, error: "Invalid token (no company)" }), { status: 403 });

//     const id = context?.params?.id;
//     if (!id) return new Response(JSON.stringify({ success: false, error: "Campaign ID missing" }), { status: 400 });

//     // fetch campaign & ensure company match
//     const campaign = await EmailCampaign.findById(id);
//     if (!campaign) return new Response(JSON.stringify({ success: false, error: "Campaign not found" }), { status: 404 });
//     if (String(campaign.companyId) !== String(decoded.companyId)) {
//       return new Response(JSON.stringify({ success: false, error: "Not authorized for this campaign" }), { status: 403 });
//     }

//     // build recipients
//     let recipients = [];

//     if (campaign.recipientSource === "segment") {
//       if (campaign.recipientList === "source_customers") {
//         const customers = await Customer.find({ companyId: decoded.companyId }, "email mobileNo");
//         recipients = customers.map((c) => (campaign.channel === "email" ? c.email : c.mobileNo)).filter(Boolean);
//       } else if (campaign.recipientList === "source_leads") {
//         const leads = await Lead.find({ companyId: decoded.companyId }, "email mobileNo");
//         recipients = leads.map((l) => (campaign.channel === "email" ? l.email : l.mobileNo)).filter(Boolean);
//       } else if (Array.isArray(campaign.recipients) && campaign.recipients.length) {
//         recipients = campaign.recipients;
//       }
//     } else if (campaign.recipientSource === "manual") {
//       recipients = (campaign.recipientManual || "").toString().split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);
//     } else if (campaign.recipientSource === "excel") {
//       const list = campaign.recipientExcelEmails || campaign.recipients || [];
//       if (!Array.isArray(list) || list.length === 0) {
//         return new Response(JSON.stringify({ success: false, error: "No emails found in Excel" }), { status: 400 });
//       }
//       recipients = list;
//     }

//     if (!recipients || recipients.length === 0) {
//       return new Response(JSON.stringify({ success: false, error: "No recipients found" }), { status: 400 });
//     }

//     // clean/validate for email channel
//     if (campaign.channel === "email") {
//       const before = recipients.length;
//       recipients = [
//         ...new Set(
//           (recipients || [])
//             .map((e) => (typeof e === "string" ? e.toLowerCase().trim() : ""))
//             .filter(Boolean)
//             .filter((e) => isValidEmail(e))
//         ),
//       ];
//       console.log(`📧 Cleaned recipients: ${before} -> ${recipients.length}`);
//       if (!recipients.length) return new Response(JSON.stringify({ success: false, error: "No valid emails after filter" }), { status: 400 });
//     } else if (campaign.channel === "whatsapp") {
//       recipients = (recipients || [])
//         .map((n) => {
//           if (!n) return null;
//           n = n.toString().replace(/\D/g, "");
//           if (n.startsWith("91")) return n;
//           if (n.startsWith("0")) return "91" + n.substring(1);
//           return "91" + n;
//         })
//         .filter(Boolean);
//     }

//     // build transporter: try EmailMaster -> env
//     let emailMaster = null;
//     if (campaign.emailMasterId) {
//       try {
//         emailMaster = await EmailMaster.findById(campaign.emailMasterId).lean();
//       } catch (e) {
//         console.warn("Failed to fetch EmailMaster:", e && e.message);
//       }
//     }
//     if (!emailMaster && campaign.companyId) {
//       // try company's active EmailMaster
//       emailMaster = await EmailMaster.findOne({ companyId: campaign.companyId, status: "Active" }).lean();
//     }

//     let transporter = await buildTransporterForEmailMaster(emailMaster);
//     if (!transporter) transporter = buildTransporterFromEnv();
//     if (!transporter && campaign.channel === "email") {
//       console.error("No SMTP transporter available.");
//       return new Response(JSON.stringify({ success: false, error: "No SMTP transporter configured" }), { status: 500 });
//     }

//     // determine From header
//     const fromEmail = (emailMaster && (emailMaster.email || emailMaster.recoveryEmail)) || process.env.SMTP_USER || campaign.sender || "no-reply@example.com";
//     const fromName = (emailMaster && (emailMaster.owner || emailMaster.purpose)) || campaign.sender || "";
//     const fromHeader = formatFrom(fromName, fromEmail);

//     // send emails
//     if (campaign.channel === "email") {
//       for (const to of recipients) {
//         const log = await EmailLog.create({
//           companyId: campaign.companyId,
//           campaignId: campaign._id,
//           to,
//           status: "sending",
//           emailMasterId: (emailMaster && emailMaster._id) || null,
//         });

//         const openPixel = BASE_URL ? `<img src="${BASE_URL.replace(/\/$/, "")}/api/track/email-open?id=${log._id}" width="1" height="1" style="display:none;" />` : "";
//         const attachmentLink = (campaign.attachments && campaign.attachments.length) ? `<a href="${BASE_URL}/api/track/attachment?id=${log._id}">📎 Download Attachment</a>` : "";
//         let url = campaign.ctaLink || "";

// if (url && !url.startsWith("http")) {
//   url = "https://" + url;
// }

// const trackedLink = campaign.ctaText
//   ? `<a href="${BASE_URL}/api/track/link?id=${log._id}&url=${encodeURIComponent(url)}">${campaign.ctaText}</a>`
//   : "";

//         const finalHtml = `
//           <div>
//             ${campaign.content || ""}
//             <br/><br/>
//             ${trackedLink}
//             <br/><br/>
//             ${attachmentLink}
//             ${openPixel}
//           </div>
//         `;

//         try {
//           await transporter.sendMail({
//             from: fromHeader,
//             to,
//             subject: campaign.emailSubject || "(no subject)",
//             html: finalHtml,
//             attachments: (campaign.attachments || []).map((p) => ({ path: p })),
//           });

//           log.status = "sent";
//           log.sentAt = new Date();
//           await log.save();
//           console.log("✅ Email sent:", to);
//         } catch (sendErr) {
//           console.error("❌ Error sending to", to, sendErr && sendErr.message);
//           log.status = "failed";
//           log.error = (sendErr && sendErr.message) || "send error";
//           await log.save();
//           // continue to next recipient
//           continue;
//         }
//       }
//     }

//     // send whatsapp
//     if (campaign.channel === "whatsapp") {
//       for (const num of recipients) {
//         try {
//           const resp = await fetch(`${META_URL}/${WHATSAPP_PHONE_ID}/messages`, {
//             method: "POST",
//             headers: { Authorization: `Bearer ${META_TOKEN}`, "Content-Type": "application/json" },
//             body: JSON.stringify({ messaging_product: "whatsapp", to: num, type: "text", text: { body: campaign.content } }),
//           });

//           if (!resp.ok) {
//             const txt = await resp.text();
//             console.warn("WhatsApp API non-OK:", resp.status, txt);
//           } else {
//             console.log("✅ WhatsApp sent:", num);
//           }
//         } catch (waErr) {
//           console.error("❌ WhatsApp send error for", num, waErr && waErr.message);
//         }
//       }
//     }

//     // update campaign
//     campaign.status = "Sent";
//     campaign.sentAt = new Date();
//     await campaign.save();

//     return new Response(JSON.stringify({ success: true, message: "Campaign sent", totalRecipients: recipients.length }), { status: 200 });
//   } catch (err) {
//     console.error("SEND ERROR:", err && err.message);
//     return new Response(JSON.stringify({ success: false, error: err && err.message }), { status: 500 });
//   }
// }



// // app/api/campaigns/[id]/send/route.js
// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import EmailCampaign from "@/models/EmailCampaign";
// import EmailLog from "@/models/EmailLog";
// import Customer from "@/models/CustomerModel";
// import Lead from "@/models/load"; // adjust if your model file name differs
// import EmailMaster from "@/models/emailMaster/emailMaster";

// import nodemailer from "nodemailer";
// import fetch from "node-fetch"; // ok to keep if your Node needs it
// import crypto from "crypto";

// // -------------------------
// // META WHATSAPP CONFIG
// // -------------------------
// const META_URL = "https://graph.facebook.com/v18.0";
// const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
// const META_TOKEN = process.env.META_WABA_TOKEN;

// // -------------------------
// // BASE URL
// // -------------------------
// const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || "";

// // -------------------------
// // Email validator
// // -------------------------
// const isValidEmail = (email) =>
//   typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

// // -------------------------
// // Decrypt helper (same logic as earlier)
// // -------------------------
// function tryDecryptEncryptedPassword(encrypted) {
//   if (!encrypted) return null;
//   const secret = process.env.ENCRYPTION_KEY;
//   if (!secret) {
//     console.warn("EMAIL_MASTER_SECRET not set — can't decrypt EmailMaster.encryptedAppPassword");
//     return null;
//   }

//   try {
//     let ivBuf = null;
//     let cipherBuf = null;

//     if (typeof encrypted === "string" && encrypted.includes(":")) {
//       const [a, b] = encrypted.split(":");
//       const isHex = /^[0-9a-fA-F]+$/.test(a) && /^[0-9a-fA-F]+$/.test(b);
//       if (isHex) {
//         ivBuf = Buffer.from(a, "hex");
//         cipherBuf = Buffer.from(b, "hex");
//       } else {
//         try {
//           ivBuf = Buffer.from(a, "base64");
//           cipherBuf = Buffer.from(b, "base64");
//         } catch (e) {}
//       }
//     }

//     if (!ivBuf) {
//       try {
//         const all = Buffer.from(encrypted, "base64");
//         if (all.length > 16) {
//           ivBuf = all.slice(0, 16);
//           cipherBuf = all.slice(16);
//         }
//       } catch (e) {}
//     }

//     if (!ivBuf) {
//       try {
//         const allHex = Buffer.from(encrypted, "hex");
//         if (allHex.length > 16) {
//           ivBuf = allHex.slice(0, 16);
//           cipherBuf = allHex.slice(16);
//         }
//       } catch (e) {}
//     }

//     if (!ivBuf || !cipherBuf) {
//       console.warn("Could not parse encryptedAppPassword for decryption.");
//       return null;
//     }

//     const key = crypto.createHash("sha256").update(secret).digest();
//     const decipher = crypto.createDecipheriv("aes-256-cbc", key, ivBuf);
//     let decrypted = decipher.update(cipherBuf, undefined, "utf8");
//     decrypted += decipher.final("utf8");
//     return decrypted;
//   } catch (err) {
//     console.warn("Decrypt failed:", err && err.message);
//     return null;
//   }
// }

// // -------------------------
// // Build transporter helper
// // -------------------------

// // -------------------------
// // Build transporter ONLY from EmailMaster
// // NO ENV fallback
// // -------------------------
// async function buildTransporterForEmailMaster(emailMaster) {
//   if (!emailMaster) {
//     console.error("❌ EmailMaster missing");
//     return null;
//   }

//   const user = emailMaster.email;
//   if (!user) {
//     console.error("❌ EmailMaster.email missing");
//     return null;
//   }

//   let pass = null;
//   if (emailMaster.encryptedAppPassword) {
//     pass = tryDecryptEncryptedPassword(emailMaster.encryptedAppPassword);
//   }

//    console.log("SMTP USER:", user)
// console.log("SMTP PASS:", pass)

//   if (!pass) {
//     console.error("❌ Cannot decrypt encryptedAppPassword. Stopping here.");
//     return null;
//   }

//   const service = (emailMaster.service || "").toLowerCase();

//   // Gmail
//   if (service === "gmail") {
//     return nodemailer.createTransport({
//       service: "gmail",
//       auth: { user, pass }
//     });
//   }

//   // Outlook/Office365
//   if (service === "outlook" || service === "office365" || service === "hotmail") {
//     return nodemailer.createTransport({
//       host: "smtp.office365.com",
//       port: 587,
//       secure: false,
//       auth: { user, pass },
//       requireTLS: true,
//       tls: { rejectUnauthorized: false },
//     });
//   }

//   console.error("❌ Unsupported service in EmailMaster:", service);
//   return null;
// }



// // async function buildTransporterForEmailMaster(emailMaster) {
// //   if (!emailMaster) return null;

// //   const user = emailMaster.email || process.env.SMTP_USER || null;
// //   let pass = null;

// //   if (emailMaster.encryptedAppPassword) {
// //     pass = tryDecryptEncryptedPassword(emailMaster.encryptedAppPassword);
// //     if (!pass) console.warn("Could not decrypt EmailMaster.encryptedAppPassword — fallback to env if available");
// //   }

// //   if (!pass) pass = process.env.SMTP_PASS || null;

// //   const service = (emailMaster.service || "gmail").toLowerCase();

// //   if (!user || !pass) {
// //     console.warn("Missing smtp user/pass for EmailMaster");
// //     return null;
// //   }

// //   if (service === "gmail") {
// //     return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
// //   }
// //   if (service === "outlook" || service === "office365" || service === "hotmail") {
// //   return nodemailer.createTransport({
// //   host: "smtp.office365.com",
// //   port: 587,
// //   secure: false,
// //   auth: {
// //     user: emailMaster.email,
// //     pass: decryptedPassword // ya app password
// //   },
// //   requireTLS: true,
// //   tls: {
// //     ciphers: "SSLv3"
// //   }
// // });

// // }


// //   console.warn("EmailMaster.service is custom/unsupported (schema lacks host/port). Falling back to env transporter if available.");
// //   return null;
// // }

// function buildTransporterFromEnv() {
//   if (process.env.SMTP_USER && process.env.SMTP_PASS) {
//     return nodemailer.createTransport({ service: "gmail", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
//   }
//   return null;
// }

// function formatFrom(name, email) {
//   if (!email) return name || process.env.SMTP_USER || "no-reply@example.com";
//   if (!name) return email;
//   return `${name} <${email}>`;
// }

// // -------------------------
// // main handler
// // -------------------------
// export async function POST(req, context) {
//   try {
//     await dbConnect();

//     // token
//     const token = getTokenFromHeader(req);
//     if (!token) return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 });

//     let decoded;
//     try {
//       decoded = verifyJWT(token);
//     } catch (err) {
//       console.warn("verifyJWT failed:", err && err.message);
//       return new Response(JSON.stringify({ success: false, error: "Invalid token" }), { status: 401 });
//     }
//     if (!decoded?.companyId) return new Response(JSON.stringify({ success: false, error: "Invalid token (no company)" }), { status: 403 });

//     const id = context?.params?.id;
//     if (!id) return new Response(JSON.stringify({ success: false, error: "Campaign ID missing" }), { status: 400 });

//     // fetch campaign & ensure company match
//     const campaign = await EmailCampaign.findById(id);
//     if (!campaign) return new Response(JSON.stringify({ success: false, error: "Campaign not found" }), { status: 404 });
//     if (String(campaign.companyId) !== String(decoded.companyId)) {
//       return new Response(JSON.stringify({ success: false, error: "Not authorized for this campaign" }), { status: 403 });
//     }

//     // build recipients
//     let recipients = [];

//     if (campaign.recipientSource === "segment") {
//       if (campaign.recipientList === "source_customers") {
//         const customers = await Customer.find({ companyId: decoded.companyId }, "email mobileNo");
//         recipients = customers.map((c) => (campaign.channel === "email" ? c.email : c.mobileNo)).filter(Boolean);
//       } else if (campaign.recipientList === "source_leads") {
//         const leads = await Lead.find({ companyId: decoded.companyId }, "email mobileNo");
//         recipients = leads.map((l) => (campaign.channel === "email" ? l.email : l.mobileNo)).filter(Boolean);
//       } else if (Array.isArray(campaign.recipients) && campaign.recipients.length) {
//         recipients = campaign.recipients;
//       }
//     } else if (campaign.recipientSource === "manual") {
//       recipients = (campaign.recipientManual || "").toString().split(/[\n,]+/).map((x) => x.trim()).filter(Boolean);
//     } else if (campaign.recipientSource === "excel") {
//       const list = campaign.recipientExcelEmails || campaign.recipients || [];
//       if (!Array.isArray(list) || list.length === 0) {
//         return new Response(JSON.stringify({ success: false, error: "No emails found in Excel" }), { status: 400 });
//       }
//       recipients = list;
//     }

//     if (!recipients || recipients.length === 0) {
//       return new Response(JSON.stringify({ success: false, error: "No recipients found" }), { status: 400 });
//     }

//     // clean/validate for email channel
//     if (campaign.channel === "email") {
//       const before = recipients.length;
//       recipients = [
//         ...new Set(
//           (recipients || [])
//             .map((e) => (typeof e === "string" ? e.toLowerCase().trim() : ""))
//             .filter(Boolean)
//             .filter((e) => isValidEmail(e))
//         ),
//       ];
//       console.log(`📧 Cleaned recipients: ${before} -> ${recipients.length}`);
//       if (!recipients.length) return new Response(JSON.stringify({ success: false, error: "No valid emails after filter" }), { status: 400 });
//     } else if (campaign.channel === "whatsapp") {
//       recipients = (recipients || [])
//         .map((n) => {
//           if (!n) return null;
//           n = n.toString().replace(/\D/g, "");
//           if (n.startsWith("91")) return n;
//           if (n.startsWith("0")) return "91" + n.substring(1);
//           return "91" + n;
//         })
//         .filter(Boolean);
//     }

//     // build transporter: try EmailMaster -> env
//     let emailMaster = null;
//     if (campaign.emailMasterId) {
//       try {
//         emailMaster = await EmailMaster.findById(campaign.emailMasterId).lean();
//       } catch (e) {
//         console.warn("Failed to fetch EmailMaster:", e && e.message);
//       }
//     }
//     if (!emailMaster && campaign.companyId) {
//       // try company's active EmailMaster
//       emailMaster = await EmailMaster.findOne({ companyId: campaign.companyId, status: "Active" }).lean();
//     }

//     let transporter = await buildTransporterForEmailMaster(emailMaster);
//     if (!transporter) transporter = buildTransporterFromEnv();
//     if (!transporter && campaign.channel === "email") {
//       console.error("No SMTP transporter available.");
//       return new Response(JSON.stringify({ success: false, error: "No SMTP transporter configured" }), { status: 500 });
//     }

//     // determine From header
//     const fromEmail = (emailMaster && (emailMaster.email || emailMaster.recoveryEmail)) || process.env.SMTP_USER || campaign.sender || "no-reply@example.com";
//     const fromName = (emailMaster && (emailMaster.owner || emailMaster.purpose)) || campaign.sender || "";
//     const fromHeader = formatFrom(fromName, fromEmail);

//     // send emails
//     if (campaign.channel === "email") {
//       for (const to of recipients) {
//         const log = await EmailLog.create({
//           companyId: campaign.companyId,
//           campaignId: campaign._id,
//           to,
//           status: "sending",
//           emailMasterId: (emailMaster && emailMaster._id) || null,
//         });

//         const openPixel = BASE_URL ? `<img src="${BASE_URL.replace(/\/$/, "")}/api/track/email-open?id=${log._id}" width="1" height="1" style="display:none;" />` : "";
//         const attachmentLink = (campaign.attachments && campaign.attachments.length) ? `<a href="${BASE_URL}/api/track/attachment?id=${log._id}">📎 Download Attachment</a>` : "";
//         const trackedLink = campaign.ctaText ? `<a href="${BASE_URL}/api/track/link?id=${log._id}&url=${encodeURIComponent(campaign.ctaLink || "")}">${campaign.ctaText}</a>` : "";

//         const finalHtml = `
//           <div>
//             ${campaign.content || ""}
//             <br/><br/>
//             ${trackedLink}
//             <br/><br/>
//             ${attachmentLink}
//             ${openPixel}
//           </div>
//         `;

//         try {
//           await transporter.sendMail({
//             from: fromHeader,
//             to,
//             subject: campaign.emailSubject || "(no subject)",
//             html: finalHtml,
//             attachments: (campaign.attachments || []).map((p) => ({ path: p })),
//           });

//           log.status = "sent";
//           log.sentAt = new Date();
//           await log.save();
//           console.log("✅ Email sent:", to);
//         } catch (sendErr) {
//           console.error("❌ Error sending to", to, sendErr && sendErr.message);
//           log.status = "failed";
//           log.error = (sendErr && sendErr.message) || "send error";
//           await log.save();
//           // continue to next recipient
//           continue;
//         }
//       }
//     }

//     // send whatsapp
//     if (campaign.channel === "whatsapp") {
//       for (const num of recipients) {
//         try {
//           const resp = await fetch(`${META_URL}/${WHATSAPP_PHONE_ID}/messages`, {
//             method: "POST",
//             headers: { Authorization: `Bearer ${META_TOKEN}`, "Content-Type": "application/json" },
//             body: JSON.stringify({ messaging_product: "whatsapp", to: num, type: "text", text: { body: campaign.content } }),
//           });

//           if (!resp.ok) {
//             const txt = await resp.text();
//             console.warn("WhatsApp API non-OK:", resp.status, txt);
//           } else {
//             console.log("✅ WhatsApp sent:", num);
//           }
//         } catch (waErr) {
//           console.error("❌ WhatsApp send error for", num, waErr && waErr.message);
//         }
//       }
//     }

//     // update campaign
//     campaign.status = "Sent";
//     campaign.sentAt = new Date();
//     await campaign.save();

//     return new Response(JSON.stringify({ success: true, message: "Campaign sent", totalRecipients: recipients.length }), { status: 200 });
//   } catch (err) {
//     console.error("SEND ERROR:", err && err.message);
//     return new Response(JSON.stringify({ success: false, error: err && err.message }), { status: 500 });
//   }
// }


