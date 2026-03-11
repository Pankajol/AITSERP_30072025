// app/api/claude/route.js  (or pages/api/claude.js)
// This proxies all Anthropic API calls from the frontend

import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":            "application/json",
        "x-api-key":               process.env.ANTHROPIC_API_KEY,   // ← set in .env.local
        "anthropic-version":       "2023-06-01",
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
      return NextResponse.json(
        { error: data.error?.message || "Claude API error" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Claude proxy error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}