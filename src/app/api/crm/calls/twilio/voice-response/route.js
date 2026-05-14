import { NextResponse } from "next/server";
import { VoiceResponse } from "twilio/lib/twiml/VoiceResponse";

export async function POST() {
  const twiml = new VoiceResponse();
  twiml.say("Hello, this is a test call from your Twilio integration. Goodbye!");
  twiml.hangup();
  
  return new NextResponse(twiml.toString(), {
    headers: { "Content-Type": "text/xml" },
  });
}