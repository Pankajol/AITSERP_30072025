import dbConnect from "@/lib/db";
import EmailLog from "@/models/EmailLog";
import fs from "fs";
import path from "path";

export async function GET(req) {
  try {
    await dbConnect();

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) return new Response("Missing ID", { status: 400 });

    await EmailLog.findByIdAndUpdate(id, {
      attachmentOpened: true,
    });

    // TODO: yahan apni actual file ka path use karo
    const filePath = path.join(process.cwd(), "upload", "sample.pdf");

    if (!fs.existsSync(filePath)) {
      return new Response("File not found", { status: 404 });
    }

    const file = fs.readFileSync(filePath);

    return new Response(file, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline; filename=attachment.pdf",
      },
    });
  } catch (err) {
    console.error("attachment track error:", err);
    return new Response("Error", { status: 500 });
  }
}
