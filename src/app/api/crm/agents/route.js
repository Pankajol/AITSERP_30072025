export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import AgentProfile from "@/models/crm/AgentProfile";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function bad(status, msg) {
  return Response.json({ success: false, msg }, { status });
}

async function auth(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: bad(401, "Unauthorized") };
  const user = verifyJWT(token);
  if (!user) return { error: bad(401, "Invalid token") };
  return { user };
}

export async function POST(req) {
  await dbConnect();
  const { user, error } = await auth(req);
  if (error) return error;

  const body = await req.json();

  const doc = await AgentProfile.findOneAndUpdate(
    { companyId: user.companyId, userId: user._id },
    {
      $set: {
        categories: body.categories || ["general"],
        priority: body.priority || 1,
        isOnline: body.isOnline ?? true,
      },
      $setOnInsert: { isBusy: false },
    },
    { upsert: true, new: true }
  );

  return Response.json({ success: true, agent: doc });
}

export async function GET(req) {
  await dbConnect();
  const { user, error } = await auth(req);
  if (error) return error;

  const agents = await AgentProfile.find({ companyId: user.companyId }).sort({ priority: -1 });
  return Response.json({ success: true, agents });
}
