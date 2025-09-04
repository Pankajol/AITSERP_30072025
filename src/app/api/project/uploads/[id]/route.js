import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Attachment from "@/models/project/AttachmentModel";
import { v2 as cloudinary } from "cloudinary";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const file = await Attachment.findOne({
      _id: params.id,
      company: decoded.company,
    }).populate("uploadedBy", "name email");

    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(file);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const body = await req.json();
    const updated = await Attachment.findOneAndUpdate(
      { _id: params.id, company: decoded.company },
      body,
      { new: true }
    );

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const file = await Attachment.findOne({ _id: params.id, company: decoded.company });
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Delete from Cloudinary
    const publicId = file.fileUrl.split("/").pop().split(".")[0];
    await cloudinary.uploader.destroy(publicId);

    await file.deleteOne();

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
