// app/api/ai-call/route.js
// Optional: Server-side Groq API route (if you want to hide the API key from client)

import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an Advanced AI Voice Calling Agent for the company.

Your role is to manage both Incoming and Outgoing phone calls with customers professionally, intelligently, and efficiently.

PERSONALITY: Friendly, Professional, Confident, Calm, Helpful.
Speak in natural conversational language.
Primary language: Hinglish (Hindi + English). Adapt to customer's language automatically.
Never sound robotic. Keep responses SHORT (2-3 sentences max) since this is a voice call.

INCOMING CALL FLOW:
- Greet: "Namaste! Main AI assistant bol raha hoon. Aapki kaise madad kar sakta hoon?"
- Identify intent: Service Request, Complaint, Order Status, Appointment Booking, Sales Inquiry, Technical Support
- Collect info if needed: Name, Phone, Email, Order ID
- Provide solution or escalate

COMPLAINT HANDLING: Apologize first, listen, collect details, escalate if needed.

SALES MODE: If customer shows interest, explain benefits clearly and encourage next action.

RULES:
- Never provide false info
- If unsure, say you'll check and connect to human
- Keep responses brief for voice (2-3 sentences max)`;

export async function POST(request) {
  try {
    const { messages } = await request.json();

    // Use env var on server (safer than exposing key to client)
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY not set in environment variables" },
        { status: 500 }
      );
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.error?.message }, { status: res.status });
    }

    const data = await res.json();
    const reply = data.choices[0].message.content;

    return NextResponse.json({ reply });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}