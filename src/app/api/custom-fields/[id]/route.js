export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import CustomField from "@/models/CustomField";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

/* =========================
   PUT → Update Custom Field
   ========================= */
export async function PUT(req, { params }) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    let decoded;

    try {
      decoded = verifyJWT(token);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const updated = await CustomField.findOneAndUpdate(
      {
        _id: params.id,
        companyId: decoded.companyId, // 🔒 company wise security
      },
      body,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Field not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    console.error("PUT custom-field error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE → Soft Delete Field
   ========================= */
export async function DELETE(req, { params }) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    let decoded;

    try {
      decoded = verifyJWT(token);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );
    }

    const deleted = await CustomField.findOneAndUpdate(
      {
        _id: params.id,
        companyId: decoded.companyId,
      },
      { isActive: false }, // ⭐ soft delete
      { new: true }
    );

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Field not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Field deleted",
    });
  } catch (err) {
    console.error("DELETE custom-field error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}