import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Attachment from "@/models/helpdesk/Attachment";
import fs from "fs";
import path from "path";

export const config = {
  api: { bodyParser: false },
};

async function streamToFile(stream, filepath) {
  return new Promise((resolve, reject) => {
    const out = fs.createWriteStream(filepath);
    stream.pipe(out);
    out.on("finish", () => resolve());
    out.on("error", reject);
  });
}

export async function POST(req) {
  await dbConnect();

  // AUTH
  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });
  let user;
  try { user = verifyJWT(token); } catch { return NextResponse.json({ success:false, msg:"Invalid token" }, { status:403 }); }

  // Parse multipart/form-data using Request.formData() (Next.js App Router supports it)
  const form = await req.formData();
  const file = form.get("file");
  const ticketId = form.get("ticketId") || null;

  if (!file) return NextResponse.json({ success:false, msg:"No file" }, { status:400 });

  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const filename = `${Date.now()}_${Array.from(file.name).slice(0,120).join("")}`;
  const filepath = path.join(uploadsDir, filename);

  // file.stream() available
  const stream = file.stream();
  await streamToFile(stream, filepath);

  // For production you should upload to S3/Cloudinary and set url accordingly.
  const url = `/uploads/${filename}`; // You should serve uploads static or via next file handler

  const att = await Attachment.create({
    companyId: user.companyId,
    ticketId,
    filename,
    url,
    uploadedBy: user.id,
    size: file.size || 0,
    mimeType: file.type || "application/octet-stream",
  });

  return NextResponse.json({ success: true, attachment: att });
}
