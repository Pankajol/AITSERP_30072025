import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return new Response(JSON.stringify({ success: false, error: "No file uploaded" }), {
        status: 400,
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // SAFE UPLOAD DIRECTORY
    const uploadDir = path.join(process.cwd(), "uploads");

    // Ensure folder exists
    await mkdir(uploadDir, { recursive: true });

    // Save filename
    const filename = Date.now() + "-" + file.name;
    const filepath = path.join(uploadDir, filename);

    // Write to disk
    await writeFile(filepath, buffer);

    return new Response(
      JSON.stringify({
        success: true,
        filePath: `/uploads/${filename}`, // << saved for DB
        fullPath: filepath, // useful for CRON debugging
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}
