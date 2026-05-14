// src/app/api/crm/calls/vapi/make-call/route.js
// This path matches what VapiOutboundCall.jsx calls:
//   fetch("/api/crm/calls/vapi/make-call", { method: "POST" })
//   fetch(`/api/crm/calls/vapi/make-call?callId=${callId}`)

import { NextResponse } from "next/server";

// POST — initiate outbound call
export async function POST(request) {
  try {
    const VAPI_API_KEY = process.env.VAPI_API_KEY;
    const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID;

    if (!VAPI_API_KEY) {
      return NextResponse.json(
        { error: "VAPI_API_KEY not set in .env.local" },
        { status: 500 }
      );
    }

    if (!VAPI_PHONE_NUMBER_ID) {
      return NextResponse.json(
        { error: "VAPI_PHONE_NUMBER_ID not set in .env.local" },
        { status: 500 }
      );
    }

    const { customerNumber, customerName } = await request.json();

    if (!customerNumber) {
      return NextResponse.json(
        { error: "customerNumber is required" },
        { status: 400 }
      );
    }

    const callPayload = {
      phoneNumberId: VAPI_PHONE_NUMBER_ID,
      customer: {
        number: customerNumber,
        name: customerName || "",
      },
      // Inline assistant — no pre-created assistant needed
      assistant: {
        name: "AI Calling Agent",
        firstMessage: `Namaste! Main AI assistant bol raha hoon. Kya main ${customerName || "aapse"} ek minute baat kar sakta hoon?`,
        model: {
          provider: "groq",
          model: "llama-3.1-8b-instant",
          messages: [
            {
              role: "system",
              content: `You are an Advanced AI Voice Calling Agent for a CRM system.

PERSONALITY: Friendly, Professional, Confident, Calm, Helpful.
Language: Hinglish (Hindi + English). Adapt to customer's language automatically.
Keep responses SHORT — max 2-3 sentences. This is a live voice call.

YOUR GOALS:
- Greet the customer warmly
- Understand their needs or reason for call
- Qualify the lead or resolve their query
- Book appointment or collect callback time if needed
- Handle complaints politely — apologize first, then help

RULES:
- Never give false information
- If unsure, say you will check and connect to human agent
- Always be polite, calm and professional
- End call gracefully: "Dhanyavaad aapke time ke liye. Aapka din shubh ho!"`,
            },
          ],
          temperature: 0.7,
          maxTokens: 150,
        },
        voice: {
          provider: "playht",
          voiceId: "jennifer",
        },
        transcriber: {
          provider: "deepgram",
          model: "nova-2",
          language: "hi",
        },
        endCallFunctionEnabled: true,
        endCallMessage: "Dhanyavaad aapke time ke liye. Aapka din shubh ho!",
        silenceTimeoutSeconds: 30,
        maxDurationSeconds: 600,
      },
    };

    const response = await fetch("https://api.vapi.ai/call/phone", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(callPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("VAPI error:", data);
      return NextResponse.json(
        { error: data.message || "VAPI API error", details: data },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      callId: data.id,
      status: data.status,
      message: `Call initiated to ${customerNumber}`,
    });

  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET — check call status by callId
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const callId = searchParams.get("callId");

    if (!callId) {
      return NextResponse.json({ error: "callId is required" }, { status: 400 });
    }

    const VAPI_API_KEY = process.env.VAPI_API_KEY;

    if (!VAPI_API_KEY) {
      return NextResponse.json(
        { error: "VAPI_API_KEY not set in .env.local" },
        { status: 500 }
      );
    }

    const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || "Failed to get call status" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}