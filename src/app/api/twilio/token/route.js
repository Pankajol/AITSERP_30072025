export const runtime = "nodejs";

import { jwt } from "twilio";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const AccessToken = jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

export async function GET(req) {
  const token = getTokenFromHeader(req);
  if (!token) return Response.json({ success: false, msg: "Unauthorized" }, { status: 401 });

  const user = verifyJWT(token);
  if (!user) return Response.json({ success: false, msg: "Invalid token" }, { status: 401 });

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: process.env.TWILIO_APP_SID,
    incomingAllow: true,
  });

  const accessToken = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY_SID,
    process.env.TWILIO_API_KEY_SECRET,
    { identity: String(user._id) }
  );

  accessToken.addGrant(voiceGrant);

  return Response.json({ success: true, token: accessToken.toJwt() });
}
