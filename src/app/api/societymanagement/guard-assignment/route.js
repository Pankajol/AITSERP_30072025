import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import GuardAssignment from "@/models/society/GuardAssignment";
import Society from "@/models/society/Society";
import CompanyUser from "@/models/CompanyUser";
import Shift from "@/models/hr/Shift";
import Employee from "@/models/hr/Employee";
import LeaveBalance from "@/models/hr/LeaveBalance";
import building from "@/models/society/Building";
import bcrypt from "bcryptjs";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

async function getUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  const user = await verifyJWT(token);
  if (!user) return { error: "Invalid token", status: 401 };
  return { user };
}

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const societyId = searchParams.get("societyId");

    // ✅ ObjectId में कन्वर्ट करके क्वेरी करो
    const companyId = new mongoose.Types.ObjectId(user.companyId || user._id || user.id);
    let query = { companyId };
    if (userId) query.userId = userId;
    if (societyId) query.societyId = societyId;

    const assignments = await GuardAssignment.find(query)
      .populate("userId", "name email")
      .populate("societyId", "name code")
      .populate("buildingId", "name code")   // ✅ buildingId भी पॉप्युलेट करो
      .populate("shiftId", "name")
      .lean();

    return NextResponse.json({ success: true, data: assignments });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const data = await req.json();
    if (!data.userId || !data.societyId) {
      return NextResponse.json({ success: false, message: "userId and societyId required" }, { status: 400 });
    }

    const companyId = new mongoose.Types.ObjectId(user.companyId || user._id || user.id);
    const existing = await GuardAssignment.findOne({ userId: data.userId, companyId });
    if (existing) {
      return NextResponse.json({ success: false, message: "Staff already assigned" }, { status: 400 });
    }

    const assignment = await GuardAssignment.create({ ...data, companyId });
    return NextResponse.json({ success: true, data: assignment }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Create failed" }, { status: 500 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const companyId = new mongoose.Types.ObjectId(user.companyId || user._id || user.id);
    const data = await req.json();
    const updated = await GuardAssignment.findOneAndUpdate({ _id: id, companyId }, data, { new: true });
    if (!updated) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const companyId = new mongoose.Types.ObjectId(user.companyId || user._id || user.id);
    await GuardAssignment.findOneAndDelete({ _id: id, companyId });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}