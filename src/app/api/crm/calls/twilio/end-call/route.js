// app/api/crm/calls/twilio/end-call/route.js
import { NextResponse } from "next/server";
import twilio from "twilio";

export async function POST(req) {
  // Initialize client inside handler to avoid build-time issues
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  // Validate credentials at runtime
  if (!accountSid || !authToken) {
    return NextResponse.json(
      { error: "Twilio credentials not configured" },
      { status: 500 }
    );
  }

  const client = twilio(accountSid, authToken);
  const { callSid } = await req.json();

  if (!callSid) {
    return NextResponse.json({ error: "Missing callSid" }, { status: 400 });
  }

  try {
    await client.calls(callSid).update({ status: "completed" });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error ending call:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}