// ✅ File: app/api/suppliers/search/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Supplier from "@/models/SupplierModels";
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

    const rx = new RegExp(q, "i");

    const data = await Supplier.find({
      companyId: decoded.companyId,
      $or: [{ supplierCode: rx }, { supplierName: rx }, { contactPersonName: rx }],
    })
      .limit(20)
      .lean();

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("❌ Error in /api/suppliers/search:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
