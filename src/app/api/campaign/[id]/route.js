import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Campaign from "@/models/EmailCampaign";
import sendCampaignById from "@/lib/sendCampaignById"; // helper we'll add

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const id = params.id;
    const token = getTokenFromHeader(req);
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status:401 });
    const decoded = verifyJWT(token);

    const c = await Campaign.findOne({ _id: id, companyId: decoded.companyId });
    if (!c) return new Response(JSON.stringify({ error: "Not found" }), { status:404 });
    return new Response(JSON.stringify({ success:true, data:c }), { status:200 });
  } catch (err) {
    return new Response(JSON.stringify({ success:false, error: err.message }), { status:500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const id = params.id;
    const token = getTokenFromHeader(req);
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status:401 });
    const decoded = verifyJWT(token);

    const body = await req.json();
    const updated = await Campaign.findOneAndUpdate({ _id:id, companyId: decoded.companyId }, body, { new:true });
    if (!updated) return new Response(JSON.stringify({ error: "Not found" }), { status:404 });
    return new Response(JSON.stringify({ success:true, data:updated }), { status:200 });
  } catch (err) {
    return new Response(JSON.stringify({ success:false, error: err.message }), { status:500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const id = params.id;
    const token = getTokenFromHeader(req);
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status:401 });
    const decoded = verifyJWT(token);

    const removed = await Campaign.findOneAndDelete({ _id:id, companyId: decoded.companyId });
    if (!removed) return new Response(JSON.stringify({ error: "Not found" }), { status:404 });
    return new Response(JSON.stringify({ success:true }), { status:200 });
  } catch (err) {
    return new Response(JSON.stringify({ success:false, error: err.message }), { status:500 });
  }
}

// Custom action: send-now
export async function POST(req, { params }) {
  try {
    await dbConnect();
    const id = params.id;
    const token = getTokenFromHeader(req);
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status:401 });
    const decoded = verifyJWT(token);

    // call helper to send (email / whatsapp) and update status
    const result = await sendCampaignById(id, decoded.companyId);
    if (result.success) return new Response(JSON.stringify({ success:true }), { status:200 });
    return new Response(JSON.stringify({ success:false, error: result.error }), { status:500 });
  } catch (err) {
    return new Response(JSON.stringify({ success:false, error: err.message }), { status:500 });
  }
}
