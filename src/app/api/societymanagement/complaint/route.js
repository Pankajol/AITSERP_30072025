import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Complaint from "@/models/society/Complaint";
import Society from "@/models/society/Society";
import Building from "@/models/society/Building";
import Flat from "@/models/society/Flat";
import Employee from "@/models/hr/Employee"; // if you have assignedTo reference
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
  if (!hasPermission(user, "Complaint", "view")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const societyId = searchParams.get("societyId");
    const flatId = searchParams.get("flatId");
    const statusFilter = searchParams.get("status");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";

    let query = { companyId: user.companyId };
    if (societyId) query.societyId = societyId;
    if (flatId) query.flatId = flatId;
    if (statusFilter) query.status = statusFilter;

    if (id) {
      const comp = await Complaint.findOne({ _id: id, ...query })
        .populate("societyId flatId assignedTo")
        .lean();
      if (!comp) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: comp });
    }

    if (search) {
      query.$or = [
        { description: { $regex: search, $options: "i" } },
        { "raisedBy.name": { $regex: search, $options: "i" } },
        { "raisedBy.phone": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [complaints, total] = await Promise.all([
      Complaint.find(query)
        .populate("societyId flatId assignedTo")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Complaint.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: complaints,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  if (!hasPermission(user, "Complaint", "create")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await req.json();
    if (!data.flatId || !data.description || !data.category) {
      return NextResponse.json({ success: false, message: "flatId, description, category required" }, { status: 400 });
    }

    // ✅ Convert empty string assignedTo to null
    if (data.assignedTo === "") data.assignedTo = null;

    const Flat = (await import("@/models/society/Flat")).default;
    const flat = await Flat.findById(data.flatId).lean();
    if (!flat) return NextResponse.json({ success: false, message: "Flat not found" }, { status: 404 });

    const complaint = new Complaint({
      ...data,
      societyId: flat.societyId,
      companyId: user.companyId,
    });
    await complaint.save();
    return NextResponse.json({ success: true, data: complaint }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Create failed: " + err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  if (!hasPermission(user, "Complaint", "edit")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const data = await req.json();
    delete data.companyId;

    // ✅ Convert empty string assignedTo to null
    if (data.assignedTo === "") data.assignedTo = null;

    if (data.status === "Resolved" && !data.resolvedAt) data.resolvedAt = new Date();

    const updated = await Complaint.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!updated) return NextResponse.json({ success: false, message: "Complaint not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Update failed: " + err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  if (!hasPermission(user, "Complaint", "delete")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const deleted = await Complaint.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}