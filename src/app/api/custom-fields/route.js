export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import CustomField from "@/models/CustomField";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

/* =========================
   GET → list custom fields
   ========================= */
export async function GET(req) {
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

    if (!decoded?.companyId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const module = searchParams.get("module");

    if (!module) {
      return NextResponse.json(
        { success: false, message: "module is required" },
        { status: 400 }
      );
    }

    const fields = await CustomField.find({
      companyId: decoded.companyId,
      module,
      isActive: true,   // ✅ FIXED
    }).sort({ order: 1, createdAt: 1 });

    return NextResponse.json({
      success: true,
      data: fields,
    });
  } catch (err) {
    console.error("GET /api/custom-fields error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}

/* =========================
   POST → create custom field
   ========================= */
export async function POST(req) {
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

    if (!decoded?.companyId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      module,
      name,          // ✅ FIXED (fieldKey → name)
      label,
      type,
      options = [],
      isRequired = false,
      order = 0,
    } = body;

    if (!module || !name || !label || !type) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // 🔒 prevent duplicate name per module per company
    const exists = await CustomField.findOne({
      companyId: decoded.companyId,
      module,
      name,
    });

    if (exists) {
      return NextResponse.json(
        {
          success: false,
          message: `Field '${name}' already exists`,
        },
        { status: 409 }
      );
    }

    const field = await CustomField.create({
      companyId: decoded.companyId,
      module,
      name,
      label,
      type,
      options,
      isRequired,
      order,
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      data: field,
    });
  } catch (err) {
    console.error("POST /api/custom-fields error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}