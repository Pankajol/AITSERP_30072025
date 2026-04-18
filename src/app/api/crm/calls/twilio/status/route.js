// app/api/crm/calls/twilio/status/route.js
import { NextResponse } from "next/server";
import twilio from "twilio";

export async function GET(req) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return NextResponse.json(
      { error: "Twilio credentials not configured" },
      { status: 500 }
    );
  }

  const client = twilio(accountSid, authToken);
  const { searchParams } = new URL(req.url);
  const callSid = searchParams.get("callSid");

  if (!callSid) {
    return NextResponse.json({ error: "Missing callSid" }, { status: 400 });
  }

  try {
    const call = await client.calls(callSid).fetch();
    return NextResponse.json({
      sid: call.sid,
      status: call.status,
      duration: call.duration,
    });
  } catch (error) {
    console.error("Error fetching call status:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}