// app/api/claude/route.js
// Proxy for Anthropic API — keeps API key server-side, fixes CORS/Method Not Allowed

import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":       "application/json",
        "x-api-key":          process.env.ANTHROPIC_API_KEY,  // set in .env.local
        "anthropic-version":  "2023-06-01",
      },
      body: JSON.stringify({
        model:      body.model      || "claude-sonnet-4-20250514",
        max_tokens: body.max_tokens || 1000,
        system:     body.system     || "",
        messages:   body.messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data?.error?.message || "";

      // ── Credit exhausted → return special code so frontend skips AI gracefully
      if (
        response.status === 402 ||
        msg.toLowerCase().includes("credit balance is too low") ||
        msg.toLowerCase().includes("billing")
      ) {
        return NextResponse.json({ error: "CREDIT_EXHAUSTED" }, { status: 402 });
      }

      if (msg.toLowerCase().includes("invalid x-api-key") || msg.toLowerCase().includes("authentication")) {
        return NextResponse.json({ error: "INVALID_API_KEY" }, { status: 401 });
      }

      return NextResponse.json({ error: msg || "Claude API error" }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Claude proxy error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}