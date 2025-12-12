export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import mongoose from "mongoose";
import Campaign from "@/models/EmailCampaign";
import sendCampaignById from "@/lib/sendCampaignById"; // helper that actually sends campaign

// small helpers for JSON responses
function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
function unauthorized(msg = "Unauthorized") {
  return jsonResponse({ success: false, error: msg }, 401);
}
function notFound(msg = "Not found") {
  return jsonResponse({ success: false, error: msg }, 404);
}
function badRequest(msg = "Bad Request") {
  return jsonResponse({ success: false, error: msg }, 400);
}

// validate Mongo ObjectId
function isValidObjectId(id) {
  if (!id) return false;
  return mongoose.Types.ObjectId.isValid(id);
}

// GET /api/campaigns/:id
export async function GET(req, { params }) {
  try {
    await dbConnect();

    const id = params?.id;
    if (!isValidObjectId(id)) return badRequest("Invalid campaign id");

    const token = getTokenFromHeader(req);
    if (!token) return unauthorized("Missing token");

    let decoded;
    try {
      decoded = verifyJWT(token);
    } catch (err) {
      console.warn("verifyJWT failed:", err && err.message);
      return unauthorized("Invalid token");
    }
    if (!decoded?.companyId) return unauthorized("Invalid token (no company)");

    const c = await Campaign.findOne({ _id: id, companyId: decoded.companyId }).lean();
    if (!c) return notFound("Campaign not found");
    return jsonResponse({ success: true, data: c }, 200);
  } catch (err) {
    console.error("GET /:id error:", err);
    return jsonResponse({ success: false, error: err?.message || "Server error" }, 500);
  }
}

// PUT /api/campaigns/:id
export async function PUT(req, { params }) {
  try {
    await dbConnect();

    const id = params?.id;
    if (!isValidObjectId(id)) return badRequest("Invalid campaign id");

    const token = getTokenFromHeader(req);
    if (!token) return unauthorized("Missing token");

    let decoded;
    try {
      decoded = verifyJWT(token);
    } catch (err) {
      console.warn("verifyJWT failed:", err && err.message);
      return unauthorized("Invalid token");
    }
    if (!decoded?.companyId) return unauthorized("Invalid token (no company)");

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("Missing or invalid request body");

    // Only allow safe fields to be updated if you want - here we allow full body but you can whitelist
    const updated = await Campaign.findOneAndUpdate(
      { _id: id, companyId: decoded.companyId },
      body,
      { new: true, runValidators: true }
    ).lean();

    if (!updated) return notFound("Campaign not found or not permitted");
    return jsonResponse({ success: true, data: updated }, 200);
  } catch (err) {
    console.error("PUT /:id error:", err);
    return jsonResponse({ success: false, error: err?.message || "Server error" }, 500);
  }
}

// DELETE /api/campaigns/:id
export async function DELETE(req, { params }) {
  try {
    await dbConnect();

    const id = params?.id;
    if (!isValidObjectId(id)) return badRequest("Invalid campaign id");

    const token = getTokenFromHeader(req);
    if (!token) return unauthorized("Missing token");

    let decoded;
    try {
      decoded = verifyJWT(token);
    } catch (err) {
      console.warn("verifyJWT failed:", err && err.message);
      return unauthorized("Invalid token");
    }
    if (!decoded?.companyId) return unauthorized("Invalid token (no company)");

    const removed = await Campaign.findOneAndDelete({ _id: id, companyId: decoded.companyId }).lean();
    if (!removed) return notFound("Campaign not found or not permitted");
    return jsonResponse({ success: true }, 200);
  } catch (err) {
    console.error("DELETE /:id error:", err);
    return jsonResponse({ success: false, error: err?.message || "Server error" }, 500);
  }
}

// POST /api/campaigns/:id  (custom action: send now)
export async function POST(req, { params }) {
  try {
    await dbConnect();

    const id = params?.id;
    if (!isValidObjectId(id)) return badRequest("Invalid campaign id");

    const token = getTokenFromHeader(req);
    if (!token) return unauthorized("Missing token");

    let decoded;
    try {
      decoded = verifyJWT(token);
    } catch (err) {
      console.warn("verifyJWT failed:", err && err.message);
      return unauthorized("Invalid token");
    }
    if (!decoded?.companyId) return unauthorized("Invalid token (no company)");

    // ensure campaign exists and belongs to company
    const campaign = await Campaign.findOne({ _id: id, companyId: decoded.companyId });
    if (!campaign) return notFound("Campaign not found or not permitted");

    // call helper to send campaign (should update campaign.status, logs, etc.)
    // sendCampaignById should return an object like { success: true } or { success: false, error: "msg" }
    let result;
    try {
      result = await sendCampaignById(id, decoded.companyId);
    } catch (sendErr) {
      console.error("sendCampaignById threw:", sendErr);
      return jsonResponse({ success: false, error: sendErr?.message || "Send helper error" }, 500);
    }

    if (result && result.success) {
      return jsonResponse({ success: true, data: result.data || null }, 200);
    } else {
      const msg = (result && result.error) || "Failed to send campaign";
      return jsonResponse({ success: false, error: msg }, 500);
    }
  } catch (err) {
    console.error("POST /:id (send) error:", err);
    return jsonResponse({ success: false, error: err?.message || "Server error" }, 500);
  }
}




// import dbConnect from "@/lib/db";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import Campaign from "@/models/EmailCampaign";
// import sendCampaignById from "@/lib/sendCampaignById"; // helper we'll add

// export async function GET(req, { params }) {
//   try {
//     await dbConnect();
//     const id = params.id;
//     const token = getTokenFromHeader(req);
//     if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status:401 });
//     const decoded = verifyJWT(token);

//     const c = await Campaign.findOne({ _id: id, companyId: decoded.companyId });
//     if (!c) return new Response(JSON.stringify({ error: "Not found" }), { status:404 });
//     return new Response(JSON.stringify({ success:true, data:c }), { status:200 });
//   } catch (err) {
//     return new Response(JSON.stringify({ success:false, error: err.message }), { status:500 });
//   }
// }

// export async function PUT(req, { params }) {
//   try {
//     await dbConnect();
//     const id = params.id;
//     const token = getTokenFromHeader(req);
//     if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status:401 });
//     const decoded = verifyJWT(token);

//     const body = await req.json();
//     const updated = await Campaign.findOneAndUpdate({ _id:id, companyId: decoded.companyId }, body, { new:true });
//     if (!updated) return new Response(JSON.stringify({ error: "Not found" }), { status:404 });
//     return new Response(JSON.stringify({ success:true, data:updated }), { status:200 });
//   } catch (err) {
//     return new Response(JSON.stringify({ success:false, error: err.message }), { status:500 });
//   }
// }

// export async function DELETE(req, { params }) {
//   try {
//     await dbConnect();
//     const id = params.id;
//     const token = getTokenFromHeader(req);
//     if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status:401 });
//     const decoded = verifyJWT(token);

//     const removed = await Campaign.findOneAndDelete({ _id:id, companyId: decoded.companyId });
//     if (!removed) return new Response(JSON.stringify({ error: "Not found" }), { status:404 });
//     return new Response(JSON.stringify({ success:true }), { status:200 });
//   } catch (err) {
//     return new Response(JSON.stringify({ success:false, error: err.message }), { status:500 });
//   }
// }

// // Custom action: send-now
// export async function POST(req, { params }) {
//   try {
//     await dbConnect();
//     const id = params.id;
//     const token = getTokenFromHeader(req);
//     if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status:401 });
//     const decoded = verifyJWT(token);

//     // call helper to send (email / whatsapp) and update status
//     const result = await sendCampaignById(id, decoded.companyId);
//     if (result.success) return new Response(JSON.stringify({ success:true }), { status:200 });
//     return new Response(JSON.stringify({ success:false, error: result.error }), { status:500 });
//   } catch (err) {
//     return new Response(JSON.stringify({ success:false, error: err.message }), { status:500 });
//   }
// }
