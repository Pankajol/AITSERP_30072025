import { NextResponse } from "next/server";
import twilio from "twilio";

// ─── HARDCODED CREDENTIALS (for testing only) ─────────────────

// ⚠️ Replace with your actual Twilio phone number (must be a valid number from your Twilio account)
   // Example trial number – CHANGE THIS
// ───────────────────────────────────────────────────────────────

const accountSid= process.env.TWILIO_ACCOUNT_SID || accountSid;
const authToken = process.env.TWILIO_AUTH_TOKEN || authToken;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || twilioPhoneNumber;

export async function POST(req) {
  console.log("\n=== TWILIO MAKE CALL START (HARDCODED) ===");
  console.log("TWILIO_ACCOUNT_SID:", accountSid.slice(0, 5) + "..." + accountSid.slice(-4));
  console.log("TWILIO_AUTH_TOKEN length:", authToken.length);
  console.log("TWILIO_PHONE_NUMBER:", twilioPhoneNumber);
  console.log("NEXT_PUBLIC_BASE_URL:", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000");

  // Validate hardcoded values
  if (!accountSid || !accountSid.startsWith("AC")) {
    const errorMsg = "Hardcoded TWILIO_ACCOUNT_SID is invalid (must start with AC)";
    console.error(errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }

  if (!authToken || authToken.length < 10) {
    const errorMsg = "Hardcoded TWILIO_AUTH_TOKEN is invalid";
    console.error(errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }

  if (!twilioPhoneNumber || !twilioPhoneNumber.startsWith("+")) {
    const errorMsg = "Hardcoded TWILIO_PHONE_NUMBER is invalid (must be E.164 format, e.g., +1234567890)";
    console.error(errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }

  let client;
  try {
    client = twilio(accountSid, authToken);
    console.log("✅ Twilio client created successfully (hardcoded)");
  } catch (err) {
    console.error("❌ Failed to create Twilio client:", err);
    return NextResponse.json({ success: false, error: "Twilio client init error: " + err.message }, { status: 500 });
  }

  let to, customerName;
  try {
    const body = await req.json();
    to = body.to;
    customerName = body.customerName || "Customer";
    console.log("📞 Call requested to:", to, "customerName:", customerName);
  } catch (err) {
    console.error("❌ Invalid JSON body:", err);
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  if (!to) {
    console.error("❌ Missing 'to' number");
    return NextResponse.json({ success: false, error: "Missing 'to' phone number" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const twimlUrl = `${baseUrl}/api/crm/calls/twilio/voice-response`;
  const statusCallbackUrl = `${baseUrl}/api/crm/calls/twilio/status-callback`;

  console.log("🔗 TwiML URL:", twimlUrl);
  console.log("🔗 Status Callback URL:", statusCallbackUrl);

  try {
    const call = await client.calls.create({
      url: twimlUrl,
      to: to,
      from: twilioPhoneNumber,
      statusCallback: statusCallbackUrl,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
    });

    console.log("✅ Call initiated! Call SID:", call.sid);
    return NextResponse.json({ success: true, callSid: call.sid });
  } catch (error) {
    console.error("❌ Twilio API error:", error.message);
    let userMessage = error.message;
    if (error.message.includes("not a valid phone number")) {
      userMessage = "The 'From' number is not a valid Twilio phone number. Please update the hardcoded TWILIO_PHONE_NUMBER with a real number from your Twilio Console.";
    } else if (error.message.includes("Authentication")) {
      userMessage = "Invalid Twilio credentials. Check the hardcoded SID and token.";
    } else if (error.message.includes("permission")) {
      userMessage = "Trial account restriction: verify your 'to' number in Twilio Console → Phone Numbers → Verified Caller IDs.";
    }
    return NextResponse.json({ success: false, error: userMessage }, { status: 500 });
  }
}




// import { NextResponse } from "next/server";
// import twilio from "twilio";

// export async function POST(req) {
//   console.log("\n=== TWILIO MAKE CALL START ===");

//   // 1. Read environment variables
//   const accountSid = process.env.TWILIO_ACCOUNT_SID;
//   const authToken = process.env.TWILIO_AUTH_TOKEN;
//   const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

//   console.log("TWILIO_ACCOUNT_SID:", accountSid ? `${accountSid.slice(0, 5)}...${accountSid.slice(-4)}` : "MISSING");
//   console.log("TWILIO_AUTH_TOKEN:", authToken ? "present (length: " + authToken.length + ")" : "MISSING");
//   console.log("TWILIO_PHONE_NUMBER:", twilioPhoneNumber || "MISSING");
//   console.log("NEXT_PUBLIC_BASE_URL:", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000");

//   // 2. Validate basic configuration
//   if (!accountSid || !accountSid.startsWith("AC")) {
//     const errorMsg = "TWILIO_ACCOUNT_SID is missing or invalid (must start with AC). Check .env.local";
//     console.error(errorMsg);
//     return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
//   }

//   if (!authToken) {
//     const errorMsg = "TWILIO_AUTH_TOKEN is missing. Check .env.local";
//     console.error(errorMsg);
//     return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
//   }

//   if (!twilioPhoneNumber || !twilioPhoneNumber.startsWith("+")) {
//     const errorMsg = "TWILIO_PHONE_NUMBER is missing or invalid (must be in E.164 format, e.g., +1234567890). Get a valid number from Twilio Console.";
//     console.error(errorMsg);
//     return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
//   }

//   // 3. Create Twilio client
//   let client;
//   try {
//     client = twilio(accountSid, authToken);
//     console.log("✅ Twilio client created successfully");
//   } catch (err) {
//     console.error("❌ Failed to create Twilio client:", err);
//     return NextResponse.json({ success: false, error: "Twilio client init error: " + err.message }, { status: 500 });
//   }

//   // 4. Parse request body
//   let to, customerName;
//   try {
//     const body = await req.json();
//     to = body.to;
//     customerName = body.customerName || "Customer";
//     console.log("📞 Call requested to:", to, "customerName:", customerName);
//   } catch (err) {
//     console.error("❌ Invalid JSON body:", err);
//     return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
//   }

//   if (!to) {
//     console.error("❌ Missing 'to' number");
//     return NextResponse.json({ success: false, error: "Missing 'to' phone number" }, { status: 400 });
//   }

//   // 5. Build TwiML and callback URLs
//   const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
//   const twimlUrl = `${baseUrl}/api/crm/calls/twilio/voice-response`;
//   const statusCallbackUrl = `${baseUrl}/api/crm/calls/twilio/status-callback`;

//   console.log("🔗 TwiML URL:", twimlUrl);
//   console.log("🔗 Status Callback URL:", statusCallbackUrl);

//   // 6. Make the call
//   try {
//     const call = await client.calls.create({
//       url: twimlUrl,
//       to: to,
//       from: twilioPhoneNumber,
//       statusCallback: statusCallbackUrl,
//       statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
//       statusCallbackMethod: "POST",
//     });

//     console.log("✅ Call initiated! Call SID:", call.sid);
//     return NextResponse.json({ success: true, callSid: call.sid });
//   } catch (error) {
//     console.error("❌ Twilio API error:", error.message);
//     // Provide more helpful error for common Twilio issues
//     let userMessage = error.message;
//     if (error.message.includes("not a valid phone number")) {
//       userMessage = "The 'From' number is not a valid Twilio phone number. Please check TWILIO_PHONE_NUMBER in .env.local";
//     } else if (error.message.includes("Authentication")) {
//       userMessage = "Invalid Twilio credentials. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.";
//     } else if (error.message.includes("permission")) {
//       userMessage = "Your Twilio account may not have permission to make calls (trial accounts need verified numbers).";
//     }
//     return NextResponse.json({ success: false, error: userMessage }, { status: 500 });
//   }
// }