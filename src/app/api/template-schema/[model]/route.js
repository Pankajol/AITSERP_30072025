import { getTemplateFromSchema } from "@/lib/getTemplateFromSchema";
import dbConnect from "@/lib/db";

export async function GET(req, { params }) {
  const { model } = params;

  try {
    await dbConnect();
    const modelModule = await import(`@/models/${model}.js`);
    const schema = modelModule.default.schema;

    const { headers, sampleRow } = getTemplateFromSchema(schema);
    return Response.json({ csvHeaders: headers, sampleRow });
  } catch (err) {
    console.error("Schema error:", err);
    return Response.json({ error: "Model not found or invalid" }, { status: 500 });
  }
}
