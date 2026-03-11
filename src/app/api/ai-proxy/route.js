export const runtime = "nodejs";

import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { "Content-Type": "application/json" },
  });
}

// Rate limit: max 30 calls per company per minute
const rateLimitMap = new Map();
function checkRateLimit(companyId) {
  const now   = Date.now();
  const entry = rateLimitMap.get(companyId) || { count: 0, resetAt: now + 60_000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 60_000; }
  entry.count++;
  rateLimitMap.set(companyId, entry);
  return entry.count <= 30;
}

// POST /api/ai-proxy
export async function POST(req) {
  try {
    // Auth
    const token = getTokenFromHeader(req);
    if (!token) return json({ success: false, error: "Unauthorized" }, 401);
    let decoded;
    try { decoded = verifyJWT(token); } catch { return json({ success: false, error: "Invalid token" }, 401); }
    if (!decoded?.companyId) return json({ success: false, error: "No company" }, 403);

    // Rate limit
    if (!checkRateLimit(decoded.companyId)) {
      return json({ success: false, error: "Too many AI requests. Wait a moment." }, 429);
    }

    const body = await req.json().catch(() => null);
    if (!body?.prompt) return json({ success: false, error: "prompt required" }, 400);

    const { prompt, maxTokens = 800 } = body;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return json({ success: false, error: "GROQ_API_KEY not set in .env" }, 500);

    // Call Groq (free, fast — llama3 model)
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:      "llama-3.3-70b-versatile",
        max_tokens: Math.min(maxTokens, 2048),
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Groq error:", JSON.stringify(data));
      const msg = data?.error?.message || "Groq API call failed";
      return json({ success: false, error: msg }, res.status);
    }

    const text = data?.choices?.[0]?.message?.content || "";
    if (!text) return json({ success: false, error: "Empty response from Groq" }, 500);

    return json({ success: true, text });

  } catch (err) {
    console.error("AI PROXY ERROR:", err?.message);
    return json({ success: false, error: err?.message }, 500);
  }
}