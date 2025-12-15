// app/api/custom-fields/route.js
export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import CustomField from "@/models/CustomField";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

/* =========================
   GET  → list custom fields
   ========================= */
export async function GET(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    if (!decoded?.companyId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const module = searchParams.get("module"); // Customer / Ticket / etc.

    if (!module) {
      return NextResponse.json(
        { success: false, message: "module is required" },
        { status: 400 }
      );
    }

    const fields = await CustomField.find({
      companyId: decoded.companyId,
      module,
      active: true,
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
    const decoded = verifyJWT(token);

    if (!decoded?.companyId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      module,
      fieldKey,
      label,
      type,
      source = "static",
      options = [],
      required = false,
      order = 0,
    } = body;

    if (!module || !fieldKey || !label || !type) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // 🔒 prevent duplicate fieldKey per module
    const exists = await CustomField.findOne({
      companyId: decoded.companyId,
      module,
      fieldKey,
    });

    if (exists) {
      return NextResponse.json(
        {
          success: false,
          message: `Field '${fieldKey}' already exists`,
        },
        { status: 409 }
      );
    }

    const field = await CustomField.create({
      companyId: decoded.companyId,
      module,
      fieldKey,
      label,
      type,
      source,
      options,
      required,
      order,
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
