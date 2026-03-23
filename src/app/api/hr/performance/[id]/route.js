import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import Performance from "@/models/hr/Performance";

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "performance", "update"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const body   = await req.json();
    const review = await Performance.findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
    if (!review) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: review });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "performance", "delete"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    await Performance.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true, message: "Review deleted" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}