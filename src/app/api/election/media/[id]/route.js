// app/api/election/media/[id]/route.js (PUT to update reach/engagement)
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import MediaCampaign from "@/models/election/MediaCampaign";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

async function getUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  const user = await verifyJWT(token);
  if (!user) return { error: "Invalid token", status: 401 };
  return { user };
}

export async function PUT(req, { params }) {
  const { id } = params;
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  if (!hasPermission(user, "Election Campaign", "edit")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  await dbConnect();
  try {
    const data = await req.json();
    const updated = await MediaCampaign.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { $set: { reach: data.reach, engagement: data.engagement, impressions: data.impressions } },
      { new: true }
    );
    if (!updated) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}