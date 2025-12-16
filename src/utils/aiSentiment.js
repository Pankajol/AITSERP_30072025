import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function analyzeSentimentAI(text = "") {
  if (!text) return "neutral";

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await model.generateContent(
    `Classify sentiment (positive, neutral, negative). Only one word.\n\nText:\n${text}`
  );

  return result.response.text().trim().toLowerCase();
}
