export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Call from "@/models/crm/Call";

export async function POST(req) {
  await dbConnect();
  const form = await req.formData();

  const CallStatus = form.get("CallStatus"); // ringing in-progress completed busy failed no-answer
  const To = form.get("To");
  const From = form.get("From");

  // basic mapping
  let status = "ringing";
  if (CallStatus === "in-progress") status = "connected";
  if (CallStatus === "completed") status = "ended";
  if (CallStatus === "failed") status = "failed";
  if (CallStatus === "busy") status = "busy";
  if (CallStatus === "no-answer") status = "missed";

  // Update latest call to customer
  const call = await Call.findOne({ toPhone: To }).sort({ createdAt: -1 });
  if (call) {
    call.status = status;

    if (status === "ended") {
      call.endedAt = new Date();
      call.durationSec = Math.max(
        0,
        Math.floor((call.endedAt.getTime() - new Date(call.startedAt).getTime()) / 1000)
      );
    }

    await call.save();
  }

  return Response.json({ success: true });
}
