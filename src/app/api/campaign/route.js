export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import EmailCampaign from "@/models/EmailCampaign";

// helper responses
function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function badRequest(message) {
  return jsonResponse({ success: false, error: message }, 400);
}
function unauthorized(message = "Unauthorized") {
  return jsonResponse({ success: false, error: message }, 401);
}

// small email validator
const isValidEmail = (e) =>
  typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

// sanitize excel emails: returns array of unique valid emails (lowercase)
function sanitizeEmails(arr) {
  if (!Array.isArray(arr)) return [];
  const cleaned = arr
    .map((x) => (typeof x === "string" ? x.trim().toLowerCase() : ""))
    .filter(Boolean)
    .filter((e) => isValidEmail(e));
  return Array.from(new Set(cleaned));
}

// ==========================================================
//  CREATE CAMPAIGN (POST)
// ==========================================================
export async function POST(req) {
  try {
    await dbConnect();

    // ---------------- AUTH CHECK ----------------
    const token = getTokenFromHeader(req);
    if (!token) return unauthorized("Missing token");

    let decoded;
    try {
      decoded = verifyJWT(token);
    } catch (err) {
      console.warn("verifyJWT failed:", err && err.message);
      return unauthorized("Invalid token");
    }

    if (!decoded || !decoded.companyId) return unauthorized("Invalid token (no company)");

    const body = await req.json().catch(() => null);
    if (!body) return badRequest("Missing request body");

    const {
      campaignName,
      scheduledTime,
      channel,
      sender,
      content,
      emailSubject,
      ctaText,
      recipientSource,
      recipientList,
      recipientManual,
      recipientExcelEmails,
      attachments,
      templateId,
      emailMasterId,
    } = body;

    // basic validations
    if (!campaignName || typeof campaignName !== "string") return badRequest("Campaign Name is required");
    if (!scheduledTime) return badRequest("Scheduled time is required");
    if (!channel || !["email", "whatsapp"].includes(channel)) return badRequest("Invalid channel type");
    if (!sender || typeof sender !== "string") return badRequest("Sender is required");
    if (!content) return badRequest("Content is required");

    // Email specific validations
    if (channel === "email") {
      if (!emailSubject || typeof emailSubject !== "string") return badRequest("Email subject required");
      if (!ctaText || typeof ctaText !== "string") return badRequest("CTA text required");
    }

    // Recipient source validations
    if (!recipientSource || !["segment", "excel", "manual"].includes(recipientSource)) {
      return badRequest("Invalid recipientSource type");
    }
    if (recipientSource === "segment" && !recipientList) return badRequest("Recipient segment is required");
    if (recipientSource === "manual" && (!recipientManual || !String(recipientManual).trim())) return badRequest("Manual recipients required");

    // Excel validation & sanitize
    let cleanedExcelEmails = [];
    if (recipientSource === "excel") {
      cleanedExcelEmails = sanitizeEmails(recipientExcelEmails || []);
      if (cleanedExcelEmails.length === 0) return badRequest("No valid emails found in Excel");
    }

    // Parse scheduledTime: expect iso string or date string
    const parsedDate = new Date(scheduledTime);
    if (isNaN(parsedDate.getTime())) {
      return badRequest("Invalid scheduledTime format. Send a valid ISO datetime.");
    }

    // OPTIONAL: If you want to convert a timezone-less datetime (from <input type="datetime-local">)
    // coming from client as "YYYY-MM-DDTHH:mm" (no timezone), and you *intend* it to be in IST,
    // then add the IST offset here. But it's better if frontend sends ISO UTC or includes timezone.
    //
    // Example (uncomment only if your frontend sends timezone-less local IST and you want to store as UTC):
    // const istOffsetMs = 5.5 * 60 * 60 * 1000;
    // const scheduledUtc = new Date(parsedDate.getTime() - istOffsetMs);
    //
    // For now we'll store the parsed date as-is (assumes client sends proper ISO/UTC or timezone-aware string).
    const scheduledUtc = parsedDate;

    // attachments default
    const attachmentsSafe = Array.isArray(attachments) ? attachments : [];

    // build campaign object
    const campaignData = {
      campaignName: campaignName.trim(),
      scheduledTime: scheduledUtc,
      channel,
      sender: sender.trim(),
      content,
      emailSubject: channel === "email" ? (emailSubject || "").trim() : undefined,
      ctaText: channel === "email" ? (ctaText || "").trim() : undefined,
      recipientSource,
      recipientList: recipientList || null,
      recipientManual: recipientSource === "manual" ? (recipientManual || "") : null,
      recipientExcelEmails: recipientSource === "excel" ? cleanedExcelEmails : [],
      attachments: attachmentsSafe,
      templateId: templateId || null,
      emailMasterId: emailMasterId || null,
      companyId: decoded.companyId,
      createdBy: decoded.id || null,
      status: "Scheduled",
    };

    const campaign = await EmailCampaign.create(campaignData);

    return jsonResponse({ success: true, data: campaign }, 201);
  } catch (err) {
    console.error("CREATE CAMPAIGN ERROR:", err && err.message);
    return jsonResponse({ success: false, error: err?.message || "Server error" }, 500);
  }
}

// ==========================================================
//  GET ALL CAMPAIGNS — COMPANY SPECIFIC
// ==========================================================
export async function GET(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token) return unauthorized("Missing token");

    let decoded;
    try {
      decoded = verifyJWT(token);
    } catch (err) {
      console.warn("verifyJWT failed:", err && err.message);
      return unauthorized("Invalid token");
    }

    if (!decoded || !decoded.companyId) return unauthorized("Invalid token (no company)");

    const campaigns = await EmailCampaign.find({ companyId: decoded.companyId }).sort({ createdAt: -1 });

    return jsonResponse({ success: true, data: campaigns }, 200);
  } catch (err) {
    console.error("GET CAMPAIGNS ERROR:", err && err.message);
    return jsonResponse({ success: false, error: err?.message || "Server error" }, 500);
  }
}




// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import EmailCampaign from "@/models/EmailCampaign";


// // helper
// function badRequest(message) {
//   return new Response(JSON.stringify({ success: false, error: message }), {
//     status: 400,
//   });
// }

// // ==========================================================
// //  CREATE CAMPAIGN (POST)
// // ==========================================================
// export async function POST(req) {
//   try {
//     await dbConnect();

//     // ---------------- AUTH CHECK ----------------
//     const token = getTokenFromHeader(req);
//     if (!token) return badRequest("Unauthorized");

//     const decoded = verifyJWT(token);
//     if (!decoded?.companyId) return badRequest("Invalid token");

//     const body = await req.json();

//     const {
//       campaignName,
//       scheduledTime,
//       channel,
//       sender,
//       content,
//       emailSubject,
//       ctaText,
//       recipientSource,
//       recipientList,
//       recipientManual,
//       recipientExcelEmails, // ✅ NEW
//       attachments,
//     } = body;

//     if (!campaignName) return badRequest("Campaign Name is required");
//     if (!scheduledTime) return badRequest("Scheduled time is required");
//     if (!channel || !["email", "whatsapp"].includes(channel))
//       return badRequest("Invalid channel type");
//     if (!sender) return badRequest("Sender is required");
//     if (!content) return badRequest("Content is required");

//     // Email Specific
//     if (channel === "email") {
//       if (!emailSubject) return badRequest("Email subject required");
//       if (!ctaText) return badRequest("CTA text required");
//     }

//     // WhatsApp Specific
//     if (channel === "whatsapp") {
//       delete body.emailSubject;
//       delete body.ctaText;
//     }

//     // Recipient Source
//     if (
//       !recipientSource ||
//       !["segment", "excel", "manual"].includes(recipientSource)
//     )
//       return badRequest("Invalid recipientSource type");

//     if (recipientSource === "segment" && !recipientList)
//       return badRequest("Recipient segment is required");

//     if (recipientSource === "manual" && !recipientManual)
//       return badRequest("Manual recipients required");

//     // ✅ UPDATED EXCEL VALIDATION
//     if (
//       recipientSource === "excel" &&
//       (!recipientExcelEmails || recipientExcelEmails.length === 0)
//     ) {
//       return badRequest("No valid emails found in Excel");
//     }

//     // convert to IST before saving
//     const istDate = new Date(
//       new Date(scheduledTime).getTime() + 5.5 * 60 * 60 * 1000
//     );

//     const campaign = await EmailCampaign.create({
//       campaignName,
//       scheduledTime: istDate,
//       channel,
//       sender,
//       content,
//       emailSubject,
//       ctaText,

//       recipientSource,
//       recipientList,
//       recipientManual,
//       recipientExcelEmails, // ✅ SAVE THIS

//       attachments,
//       companyId: decoded.companyId,
//       createdBy: decoded.id,
//       status: "Scheduled",
//     });

//     return new Response(JSON.stringify({ success: true, data: campaign }), {
//       status: 201,
//     });
//   } catch (err) {
//     return new Response(
//       JSON.stringify({ success: false, error: err.message }),
//       { status: 500 }
//     );
//   }
// }




// // ==========================================================
// //  GET ALL CAMPAIGNS — COMPANY SPECIFIC
// // ==========================================================
// export async function GET(req) {
//   try {
//     await dbConnect();

//     const token = getTokenFromHeader(req);
//     if (!token)
//       return new Response(JSON.stringify({ error: "Unauthorized" }), {
//         status: 401,
//       });

//     const decoded = verifyJWT(token);

//     const campaigns = await EmailCampaign.find({
//       companyId: decoded.companyId,
//     }).sort({ createdAt: -1 });

//     return new Response(
//       JSON.stringify({ success: true, data: campaigns }),
//       { status: 200 }
//     );

//   } catch (err) {
//     return new Response(
//       JSON.stringify({ success: false, error: err.message }),
//       { status: 500 }
//     );
//   }
// }
