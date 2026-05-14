// ✅ File: app/api/items/lookup/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Item from "@/models/ItemModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectDB();

    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json(
        { success: false, error: "Unauthorized - Missing token" },
        { status: 401 }
      );

    const decoded = verifyJWT(token);
    if (!decoded?.companyId)
      return NextResponse.json(
        { success: false, error: "Unauthorized - Invalid token payload" },
        { status: 401 }
      );

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code")?.trim();
    const name = searchParams.get("name")?.trim();

    if (!code && !name)
      return NextResponse.json(
        { success: false, error: "Provide code or name" },
        { status: 400 }
      );

    let item = null;

    if (code) {
      item = await Item.findOne({
        companyId: decoded.companyId,
        itemCode: code,
      }).lean();
      if (item) return NextResponse.json({ success: true, data: item });
    }

    if (name) {
      item = await Item.findOne({
        companyId: decoded.companyId,
        $or: [{ itemName: name }, { description: name }],
      }).lean();
      if (item) return NextResponse.json({ success: true, data: item });
    }

    return NextResponse.json(
      { success: false, error: "Item not found" },
      { status: 404 }
    );
  } catch (err) {
    console.error("❌ Error in /api/items/lookup:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
