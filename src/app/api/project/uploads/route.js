import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Attachment from "@/models/project/AttachmentModel";
import { v2 as cloudinary } from "cloudinary";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const attachments = await Attachment.find({ company: decoded.company })
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json(attachments, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary
    const uploadRes = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ resource_type: "auto" }, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        })
        .end(buffer);
    });

    const attachment = new Attachment({
      filename: file.name,
      fileUrl: uploadRes.secure_url,
      fileType: uploadRes.resource_type,
      size: file.size,
      uploadedBy: decoded.userId,
      company: decoded.company,
    });

    await attachment.save();

    return NextResponse.json(attachment, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
