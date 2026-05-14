// ✅ File: app/api/suppliers/by-code/[code]/route.js
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Supplier from "@/models/SupplierModels";
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
    if (!decoded?.companyId)
      return NextResponse.json(
        { success: false, error: "Unauthorized - Invalid token payload" },
        { status: 401 }
      );

    const { code } = params;
    if (!code?.trim())
      return NextResponse.json(
        { success: false, error: "Supplier code required" },
        { status: 400 }
      );

    const supplier = await Supplier.findOne({
      companyId: decoded.companyId,
      supplierCode: code.trim(),
    }).lean();

    if (!supplier)
      return NextResponse.json(
        { success: false, error: "Supplier not found" },
        { status: 404 }
      );

    return NextResponse.json({ success: true, data: supplier });
  } catch (err) {
    console.error("❌ Error in /api/suppliers/by-code:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
