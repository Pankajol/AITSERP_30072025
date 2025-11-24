export const runtime = "nodejs";

import axios from "axios";
import * as cheerio from "cheerio";
import Groq from "groq-sdk";

/* --------------------------------------------
   1. GROQ CLIENT (FREE AI)
-------------------------------------------- */
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// USE VERIFIED MODEL FROM YOUR ACCOUNT
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

/* --------------------------------------------
   2. Scraper Helper
-------------------------------------------- */
async function fetchPrice(url, selector) {
  try {
    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const $ = cheerio.load(res.data);
    const txt = $(selector).first().text() || "";
    const clean = txt.replace(/[^0-9]/g, "");
    const num = clean ? parseInt(clean, 10) : null;

    return num || null;
  } catch {
    return null;
  }
}

/* --------------------------------------------
   3. AI Price Logic (FREE Groq)
-------------------------------------------- */
async function askGroq(prompt) {
  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 300,
    });

    const text = response.choices[0].message.content;

    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      return null;
    }
  } catch (err) {
    console.log("Groq Error:", err.message);
    return null;
  }
}

/* --------------------------------------------
   4. Main POST API
-------------------------------------------- */
export async function POST(req) {
  try {
    const { itemName } = await req.json();

    if (!itemName) {
      return Response.json({ error: "itemName required" }, { status: 400 });
    }

    /* --------------------------
         Scrape Market Prices
    ---------------------------*/
    const marketplaces = [
      {
        site: "Amazon",
        url: `https://www.amazon.in/s?k=${encodeURIComponent(itemName)}`,
        selector: "span.a-price-whole",
      },
      {
        site: "Flipkart",
        url: `https://www.flipkart.com/search?q=${encodeURIComponent(itemName)}`,
        selector: "div._30jeq3",
      },
    ];

    const market = [];
    for (const m of marketplaces) {
      const price = await fetchPrice(m.url, m.selector);
      market.push({ site: m.site, price });
    }

    /* --------------------------
         AI Prompt
    ---------------------------*/
    const prompt = `
You are a pricing AI. Recommend a selling price based on market data.

Item: ${itemName}
Market Data: ${JSON.stringify(market)}

Return ONLY JSON:

{
  "recommendedSellingPrice": number,
  "reason": "string",
  "strategy": "string",
  "confidence": "low" | "medium" | "high"
}
`;

    let ai = await askGroq(prompt);

    /* --------------------------
         Fallback to average
    ---------------------------*/
    if (!ai || typeof ai.recommendedSellingPrice !== "number") {
      const valid = market.filter((x) => x.price);
      const avg =
        valid.length > 0
          ? Math.round(valid.reduce((s, x) => s + x.price, 0) / valid.length)
          : 0;

      ai = {
        recommendedSellingPrice: avg,
        reason: "Groq AI fallback",
        strategy: "Use average of market",
        confidence: "low",
      };
    }

    return Response.json({ market, ai });
  } catch (err) {
    console.log("Server Error:", err.message);
    return Response.json({ error: "Server Error" }, { status: 500 });
  }
}
