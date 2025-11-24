// ✅ File: app/api/items/by-code/[code]/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Item from "@/models/ItemModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    await connectDB();

    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json(
        { success: false, error: "Unauthorized - Missing token" },
        { status: 401 }
      );

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.companyId)
      return NextResponse.json(
        { success: false, error: "Unauthorized - Invalid token payload" },
        { status: 401 }
      );

    const { code } = params;
    if (!code?.trim())
      return NextResponse.json(
        { success: false, error: "Item code is required" },
        { status: 400 }
      );

    const item = await Item.findOne({
      companyId: decoded.companyId,
      itemCode: code.trim(),
    }).lean();

    if (!item)
      return NextResponse.json(
        { success: false, error: "Item not found" },
        { status: 404 }
      );

    return NextResponse.json({ success: true, data: item });
  } catch (err) {
    console.error("❌ Error in /api/items/by-code/[code]:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
