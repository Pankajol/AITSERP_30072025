import Groq from "groq-sdk";

const groq =
  process.env.GROQ_API_KEY
    ? new Groq({ apiKey: process.env.GROQ_API_KEY })
    : null;

const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

/**
 * Analyze sentiment using Groq LLM
 * Returns: "positive" | "neutral" | "negative"
 * NEVER throws (safe for inbound email)
 */
export async function analyzeSentimentAI(text = "") {
  if (!text) return "neutral";

  // 🛡️ Safety: no key → no crash
  if (!groq) {
    console.warn("⚠️ GROQ_API_KEY missing, using neutral sentiment");
    return "neutral";
  }

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0,
      max_tokens: 5,
      messages: [
        {
          role: "system",
          content:
            "Classify the sentiment of the customer support message. Reply with only one word: positive, neutral, or negative.",
        },
        {
          role: "user",
          content: text.slice(0, 4000), // safety limit
        },
      ],
    });

    const output =
      completion.choices?.[0]?.message?.content
        ?.toLowerCase()
        ?.trim();

    if (["positive", "neutral", "negative"].includes(output)) {
      return output;
    }

    return "neutral";
  } catch (err) {
    console.error("❌ Groq sentiment failed, fallback used:", err.message);
    return "neutral"; // 🔒 NEVER break inbound flow
  }
}
