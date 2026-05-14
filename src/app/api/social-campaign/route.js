export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import SocialCampaign from "@/models/SocialCampaign";
import SocialMediaMaster from "@/models/SocialMediaMaster";

import nodemailer from "nodemailer";
import fetch from "node-fetch";
import crypto from "crypto";

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { "Content-Type": "application/json" },
  });
}

function authCheck(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: json({ success: false, error: "Unauthorized" }, 401) };
  try {
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) return { error: json({ success: false, error: "No company" }, 403) };
    return { decoded };
  } catch {
    return { error: json({ success: false, error: "Invalid token" }, 401) };
  }
}

// ── Decrypt ────────────────────────────────────────────
function decrypt(encrypted) {
  if (!encrypted) return null;
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) return encrypted;
  try {
    const [ivHex, encHex] = encrypted.split(":");
    if (!ivHex || !encHex) return encrypted;
    const key      = crypto.createHash("sha256").update(secret).digest();
    const iv       = Buffer.from(ivHex, "hex");
    const encBuf   = Buffer.from(encHex, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let dec = decipher.update(encBuf, undefined, "utf8");
    dec += decipher.final("utf8");
    return dec;
  } catch { return null; }
}

// ── Get SocialMediaMaster for company ─────────────────
async function getSocialMaster(companyId) {
  return await SocialMediaMaster.findOne({
    companyId,
    status: "Active",
  }).lean();
}

// ── Build SMTP from SocialMediaMaster (no EmailMaster) ─
// Store Gmail creds in a customPlatform: { platformName: "email", token: encryptedPass, accountId: email }
async function buildEmailTransporter(master) {
  if (!master) return null;

  // Check customPlatforms for "email" entry
  const emailEntry = master.customPlatforms?.find(
    (cp) => cp.platformName?.toLowerCase() === "email" && cp.enabled
  );
  if (!emailEntry) return null;

  const user = emailEntry.accountId; // email address stored in accountId
  const pass = decrypt(emailEntry.token);
  if (!user || !pass) return null;

  const service = emailEntry.extra1 || "gmail"; // service name in extra1

  if (service.toLowerCase() === "gmail") {
    return { transporter: nodemailer.createTransport({ service: "gmail", auth: { user, pass } }), from: user };
  }
  if (["outlook","office365"].includes(service.toLowerCase())) {
    return {
      transporter: nodemailer.createTransport({
        host: "smtp.office365.com", port: 587, secure: false,
        auth: { user, pass }, requireTLS: true,
        tls: { rejectUnauthorized: false },
      }),
      from: user,
    };
  }
  return null;
}

// ── WhatsApp send from SocialMediaMaster ───────────────
async function sendWhatsApp(numbers, message, master) {
  const wa = master?.whatsapp;
  if (!wa?.enabled) {
    return numbers.map((n) => ({ to: n, ok: false, error: "WhatsApp not enabled in Social Master" }));
  }
  const phoneId = wa.phoneNumberId;
  const token   = decrypt(wa.token);
  if (!phoneId || !token) {
    return numbers.map((n) => ({ to: n, ok: false, error: "WhatsApp credentials missing" }));
  }

  const results = [];
  for (const num of numbers) {
    try {
      const clean = num.toString().replace(/\D/g, "");
      const to    = clean.startsWith("91") ? clean : "91" + clean;
      const res   = await fetch(
        `https://graph.facebook.com/v18.0/${phoneId}/messages`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: message } }),
        }
      );
      results.push({ to, ok: res.ok });
      await new Promise((r) => setTimeout(r, 300));
    } catch (e) {
      results.push({ to: num, ok: false, error: e.message });
    }
  }
  return results;
}

// ── Email send ─────────────────────────────────────────
async function sendEmails(recipients, subject, htmlBody, master) {
  const emailCfg = await buildEmailTransporter(master);
  if (!emailCfg) {
    return recipients.map((to) => ({ to, ok: false, error: "Email not configured in Social Master" }));
  }

  try { await emailCfg.transporter.verify(); } catch (e) {
    return recipients.map((to) => ({ to, ok: false, error: "SMTP verify failed: " + e.message }));
  }

  const results = [];
  for (const to of recipients) {
    try {
      await emailCfg.transporter.sendMail({
        from: emailCfg.from, to, subject, html: htmlBody,
        text: htmlBody.replace(/<[^>]+>/g, ""),
        headers: { "List-Unsubscribe": `<mailto:${emailCfg.from}?subject=unsubscribe>`, "Precedence": "bulk" },
      });
      results.push({ to, ok: true });
      await new Promise((r) => setTimeout(r, 800));
    } catch (e) {
      results.push({ to, ok: false, error: e.message });
    }
  }
  return results;
}

// ── Platform-specific post helpers ────────────────────
async function postToFacebook(master, caption, mediaUrls) {
  const fb = master?.facebook;
  if (!fb?.enabled) return { ok: false, error: "Facebook not enabled" };
  const token   = decrypt(fb.token);
  const pageId  = fb.accountId;
  if (!token || !pageId) return { ok: false, error: "Facebook credentials missing" };

  try {
    const body = mediaUrls?.[0]
      ? { caption, url: mediaUrls[0], access_token: token }
      : { message: caption, access_token: token };
    const endpoint = mediaUrls?.[0]
      ? `https://graph.facebook.com/v18.0/${pageId}/photos`
      : `https://graph.facebook.com/v18.0/${pageId}/feed`;
    const res  = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    return res.ok ? { ok: true, postId: data.id } : { ok: false, error: data?.error?.message };
  } catch (e) { return { ok: false, error: e.message }; }
}

async function postToInstagram(master, caption, mediaUrls) {
  const ig = master?.instagram;
  if (!ig?.enabled) return { ok: false, error: "Instagram not enabled" };
  const token     = decrypt(ig.token);
  const accountId = ig.accountId;
  if (!token || !accountId || !mediaUrls?.[0]) return { ok: false, error: "Instagram needs media + credentials" };

  try {
    // Step 1: create container
    const containerRes  = await fetch(
      `https://graph.facebook.com/v18.0/${accountId}/media`,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: mediaUrls[0], caption, access_token: token }) }
    );
    const containerData = await containerRes.json();
    if (!containerRes.ok) return { ok: false, error: containerData?.error?.message };

    // Step 2: publish
    const pubRes  = await fetch(
      `https://graph.facebook.com/v18.0/${accountId}/media_publish`,
      { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creation_id: containerData.id, access_token: token }) }
    );
    const pubData = await pubRes.json();
    return pubRes.ok ? { ok: true, postId: pubData.id } : { ok: false, error: pubData?.error?.message };
  } catch (e) { return { ok: false, error: e.message }; }
}

async function postToLinkedIn(master, caption, mediaUrls) {
  const li = master?.linkedin;
  if (!li?.enabled) return { ok: false, error: "LinkedIn not enabled" };
  const token  = decrypt(li.accessToken);
  const author = li.accountId; // urn:li:organization:xxx or urn:li:person:xxx
  if (!token || !author) return { ok: false, error: "LinkedIn credentials missing" };

  try {
    const body = {
      author,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: caption },
          shareMediaCategory: mediaUrls?.[0] ? "IMAGE" : "NONE",
          ...(mediaUrls?.[0] ? {
            media: [{ status: "READY", originalUrl: mediaUrls[0] }]
          } : {}),
        },
      },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    };
    const res  = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return res.ok ? { ok: true, postId: data.id } : { ok: false, error: JSON.stringify(data) };
  } catch (e) { return { ok: false, error: e.message }; }
}

// ══════════════════════════════════════════════════════
// POST — Create Social Campaign
// ══════════════════════════════════════════════════════
export async function POST(req) {
  try {
    await dbConnect();
    const { decoded, error } = authCheck(req);
    if (error) return error;

    const body = await req.json().catch(() => null);
    if (!body) return json({ success: false, error: "Missing body" }, 400);

    const {
      campaignName, platforms, contentType, sendModes,
      topic, industry, caption, hashtags,
      mediaUrls, scheduledTime,
      emailRecipients, whatsappNumbers,
      videoScript, imagePrompt,
    } = body;

    if (!campaignName) return json({ success: false, error: "Campaign name required" }, 400);
    if (!platforms?.length) return json({ success: false, error: "Select at least one platform" }, 400);
    if (!caption) return json({ success: false, error: "Caption required" }, 400);

    // Fetch social master once
    const master = await getSocialMaster(decoded.companyId);

    const fullCaption = `${caption}\n\n${(hashtags || []).join(" ")}`.trim();

    // Save campaign
    const campaign = await SocialCampaign.create({
      companyId:       decoded.companyId,
      createdBy:       decoded.id || null,
      campaignName,
      platforms,
      contentType:     contentType || "post",
      sendModes:       sendModes || ["schedule"],
      topic,
      industry,
      caption,
      hashtags:        hashtags || [],
      mediaUrls:       mediaUrls || [],
      scheduledTime:   scheduledTime ? new Date(scheduledTime) : null,
      emailRecipients: emailRecipients || [],
      whatsappNumbers: whatsappNumbers || [],
      videoScript:     videoScript || null,
      imagePrompt:     imagePrompt || null,
      status:          sendModes?.includes("instant") ? "Sending" : "Scheduled",
    });

    const results = {};

    if (sendModes?.includes("instant")) {
      // ── Post to social platforms ───────────────────
      const postResults = {};

      for (const platform of platforms) {
        if (platform === "facebook")  postResults.facebook  = await postToFacebook(master, fullCaption, mediaUrls);
        if (platform === "instagram") postResults.instagram = await postToInstagram(master, fullCaption, mediaUrls);
        if (platform === "linkedin")  postResults.linkedin  = await postToLinkedIn(master, fullCaption, mediaUrls);
        // Twitter/YouTube: complex OAuth — log for now
        if (platform === "twitter")   postResults.twitter  = { ok: false, note: "Twitter OAuth needed — add separately" };
        if (platform === "youtube")   postResults.youtube  = { ok: false, note: "YouTube upload needed — add separately" };
      }
      results.platforms = postResults;

      // Save published IDs
      const publishedIds = {};
      Object.entries(postResults).forEach(([p, r]) => { if (r?.postId) publishedIds[p] = r.postId; });
      if (Object.keys(publishedIds).length) {
        campaign.publishedIds = publishedIds;
      }

      // ── Email ────────────────────────────────────
      if (emailRecipients?.length && (sendModes.includes("email") || sendModes.includes("instant"))) {
        const html = buildEmailHtml({ campaignName, caption, hashtags, mediaUrls });
        results.email = await sendEmails(emailRecipients, campaignName, html, master);
      }

      // ── WhatsApp ─────────────────────────────────
      if (whatsappNumbers?.length && (sendModes.includes("whatsapp") || sendModes.includes("instant"))) {
        results.whatsapp = await sendWhatsApp(whatsappNumbers, fullCaption, master);
      }

      campaign.status = "Sent";
      campaign.sentAt = new Date();
    }

    // Scheduled only — email/whatsapp on schedule
    if (!sendModes?.includes("instant") && sendModes?.includes("schedule")) {
      if (emailRecipients?.length && sendModes.includes("email")) {
        const html = buildEmailHtml({ campaignName, caption, hashtags, mediaUrls });
        results.email = await sendEmails(emailRecipients, campaignName, html, master);
      }
      if (whatsappNumbers?.length && sendModes.includes("whatsapp")) {
        results.whatsapp = await sendWhatsApp(whatsappNumbers, fullCaption, master);
      }
    }

    await campaign.save();

    return json({ success: true, data: campaign, results }, 201);
  } catch (err) {
    console.error("SOCIAL CAMPAIGN ERROR:", err?.message);
    return json({ success: false, error: err?.message }, 500);
  }
}

// ══════════════════════════════════════════════════════
// GET — List campaigns with filters
// ?status=Scheduled&platform=instagram&page=1&limit=20
// ══════════════════════════════════════════════════════
export async function GET(req) {
  try {
    await dbConnect();
    const { decoded, error } = authCheck(req);
    if (error) return error;

    const url      = new URL(req.url);
    const status   = url.searchParams.get("status");
    const platform = url.searchParams.get("platform");
    const page     = parseInt(url.searchParams.get("page")  || "1");
    const limit    = parseInt(url.searchParams.get("limit") || "20");
    const search   = url.searchParams.get("search");

    const query = { companyId: decoded.companyId };
    if (status)   query.status    = status;
    if (platform) query.platforms = platform;
    if (search)   query.campaignName = { $regex: search, $options: "i" };

    const [campaigns, total] = await Promise.all([
      SocialCampaign.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      SocialCampaign.countDocuments(query),
    ]);

    return json({ success: true, data: campaigns, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    return json({ success: false, error: err?.message }, 500);
  }
}