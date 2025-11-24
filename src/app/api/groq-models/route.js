export const runtime = "nodejs";

import Groq from "groq-sdk";

export async function GET() {
  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const models = await client.models.list();

    return Response.json({ models });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
