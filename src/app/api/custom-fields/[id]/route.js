// app/api/custom-fields/[id]/route.js
export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import CustomField from "@/models/CustomField";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";


export async function PUT(req, { params }) {
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

    const fieldId = params.id;
    const body = await req.json();

    const {
      label,
      type,
      source,
      options,
      required,
      order,
      active,
    } = body;

    const field = await CustomField.findOne({
      _id: fieldId,
      companyId: decoded.companyId,
    });

    if (!field) {
      return NextResponse.json(
        { success: false, message: "Custom field not found" },
        { status: 404 }
      );
    }

    /* ---------- SAFE UPDATES ---------- */
    if (label !== undefined) field.label = label;
    if (type !== undefined) field.type = type;
    if (source !== undefined) field.source = source;
    if (Array.isArray(options)) field.options = options;
    if (required !== undefined) field.required = required;
    if (order !== undefined) field.order = order;
    if (active !== undefined) field.active = active;

    await field.save();

    return NextResponse.json({
      success: true,
      data: field,
    });
  } catch (err) {
    console.error("PUT /api/custom-fields error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}










/* =========================
   DELETE → remove field
   ========================= */
export async function DELETE(req, { params }) {
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

    const field = await CustomField.findOneAndDelete({
      _id: params.id,
      companyId: decoded.companyId,
    });

    if (!field) {
      return NextResponse.json(
        { success: false, message: "Field not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Custom field deleted",
    });
  } catch (err) {
    console.error("DELETE /api/custom-fields error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
