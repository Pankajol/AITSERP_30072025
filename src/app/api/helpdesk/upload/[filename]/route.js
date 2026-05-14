import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req, { params }) {
  const uploadsDir = path.join(process.cwd(), "uploads");
  const filepath = path.join(uploadsDir, params.filename);
  if (!fs.existsSync(filepath)) return NextResponse.json({ success:false, msg:"Not found" }, { status:404 });
  const file = fs.readFileSync(filepath);
  return new Response(file, {
    headers: {
      "Content-Type": "application/octet-stream"
    }
  });
}
