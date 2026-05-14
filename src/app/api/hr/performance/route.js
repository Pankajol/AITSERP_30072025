import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import Performance from "@/models/hr/Performance";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "performance", "read"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const reviewMonth = searchParams.get("reviewMonth");
    const employeeId  = searchParams.get("employeeId");

    const query = {};
    if (reviewMonth) query.reviewMonth = reviewMonth;
    if (employeeId)  query.employeeId  = employeeId;

    const reviews = await Performance.find(query)
      .populate("employeeId", "fullName employeeCode")
      .populate("reviewedBy", "fullName")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: reviews });
  } catch (err) {
    console.error("GET /api/hr/performance error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "performance", "create"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const body   = await req.json();
    const review = await Performance.create(body);
    return NextResponse.json({ success: true, data: review }, { status: 201 });
  } catch (err) {
    console.error("POST /api/hr/performance error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}