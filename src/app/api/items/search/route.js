// ✅ File: app/api/items/search/route.js
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
    const q = searchParams.get("q")?.trim() || "";
    const limit = Math.min(Number(searchParams.get("limit") || 20), 100);

    const filter = { companyId: decoded.companyId };

    if (q) {
      const rx = new RegExp(q, "i");
      filter.$or = [
        { itemCode: rx },
        { itemName: rx },
        { description: rx },
      ];
    }

    const data = await Item.find(filter).limit(limit).lean();

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("❌ Error in /api/items/search:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
