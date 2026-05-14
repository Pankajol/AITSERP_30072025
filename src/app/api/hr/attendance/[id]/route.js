import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import Attendance from "@/models/hr/Attendance";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const record = await Attendance.findOne({ _id: params.id, companyId: user.companyId })
      .populate("employeeId", "fullName employeeCode");
    if (!record) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: record });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "attendance", "update"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const body   = await req.json();
    const record = await Attendance.findOneAndUpdate(
      { _id: params.id, companyId: user.companyId },
      body,
      { new: true, runValidators: true }
    ).populate("employeeId", "fullName employeeCode");

    if (!record) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: record });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "attendance", "delete"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    await Attendance.findOneAndDelete({ _id: params.id, companyId: user.companyId });
    return NextResponse.json({ success: true, message: "Record deleted" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}