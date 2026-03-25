// app/api/items/upload-image/route.js
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import dbConnect from "@/lib/db";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = [
    "admin", "sales manager", "purchase manager", "inventory manager",
    "accounts manager", "hr manager", "support executive",
    "production head", "project manager",
  ];
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some(role => allowedRoles.includes(role.trim().toLowerCase()));
}

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
    return { user };
  } catch (err) {
    return { error: "Invalid token", status: 401 };
  }
}

/* ========================================
   📤 POST /api/items/upload-image
   Accepts: multipart/form-data with "file" field
   Returns: { success: true, imageUrl: "https://..." }
======================================== */
export async function POST(req) {
  await dbConnect();

  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });
    }

    // Validate type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Invalid file type. Only JPG, PNG, WebP, GIF allowed." },
        { status: 400 }
      );
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder:         `items/${user.companyId}`,       // organise by company
          resource_type:  "image",
          allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
          transformation: [
            { width: 800, height: 800, crop: "limit" },   // max 800×800, preserve aspect ratio
            { quality: "auto:good" },                      // auto-optimise quality
            { fetch_format: "auto" },                      // serve webp/avif where supported
          ],
          public_id: `item_${user.companyId}_${Date.now()}`,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    return NextResponse.json(
      { success: true, imageUrl: uploadResult.secure_url },
      { status: 200 }
    );

  } catch (err) {
    console.error("Image upload error:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Image upload failed" },
      { status: 500 }
    );
  }
}