import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Vendor from "@/models/marketplace/Vendor";
import { verifyJWT } from "@/lib/auth"; // अपना JWT हेल्पर

export async function GET(req) {
  // ... already provided earlier (me route)
}

// 🆕 PUT – Vendor update own profile
export async function PUT(req) {
  await dbConnect();
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) return NextResponse.json({ success: false, message: "Token required" }, { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded || decoded.type !== "vendor") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    // Vendor अपनी ये फील्ड्स बदल सकता है
    const allowedUpdates = [
      "businessName", "phone", "category", "address",
      "bankDetails", "commissionPercent"   // शायद commissionPercent admin ही बदले, पर vendor को दिखा सकते हैं
    ];
    const updates = {};
    allowedUpdates.forEach(field => {
      if (body[field] !== undefined) updates[field] = body[field];
    });

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, message: "No updates provided" }, { status: 400 });
    }

    const vendor = await Vendor.findByIdAndUpdate(
      decoded.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    if (!vendor) return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: vendor });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}