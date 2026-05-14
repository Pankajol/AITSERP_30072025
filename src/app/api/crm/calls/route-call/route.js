export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Call from "@/models/crm/Call";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { pickAgent, markAgentBusy } from "@/lib/callRouter";

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

  const category = body.category || "general";
  const provider = body.provider || "twilio"; // auto-calls to customer should be twilio

  const agent = await pickAgent({ companyId: user.companyId, category });
  if (!agent) return bad(400, `No agent available for ${category}`);

  // log call in DB
  const call = await Call.create({
    companyId: user.companyId,
    category,
    provider,

    type: "external",
    direction: "outgoing",

    // agent is caller
    fromUserId: agent.userId,

    // customer
    toPhone: body.toPhone || "",
    leadId: body.leadId || null,
    customerId: body.customerId || null,

    status: "ringing",
    startedAt: new Date(),
  });

  await markAgentBusy({ companyId: user.companyId, userId: agent.userId, busy: true });

  // ✅ Here we will trigger Twilio (in next endpoint integration)
  return Response.json({ success: true, assignedAgentId: agent.userId, call });
}
