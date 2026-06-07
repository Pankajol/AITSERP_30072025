import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Notice from "@/models/society/Notice";
import Society from "@/models/society/Society";
import Building from "@/models/society/Building";
import Flat from "@/models/society/Flat";
import CompanyUser from "@/models/CompanyUser"; // ✅ needed for createdBy populate
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

async function getUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  const user = await verifyJWT(token);
  if (!user) return { error: "Invalid token", status: 401 };
  return { user };
}

function isResidentUser(user) {
  return user.role === "Resident" || user.roles?.includes("Resident");
}

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const isResident = isResidentUser(user);
  if (!isResident && !hasPermission(user, "Notice", "view")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const societyId = searchParams.get("societyId");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";

    let baseQuery = { companyId: user.companyId };
    if (societyId) baseQuery.societyId = societyId;
    if (isResident && user.societyId) {
      baseQuery.societyId = user.societyId;
    }

    const expiryCondition = {
      $or: [
        { expiryDate: { $exists: false } },
        { expiryDate: { $gt: new Date() } }
      ]
    };

    if (id) {
      const notice = await Notice.findOne({ _id: id, ...baseQuery })
        .populate("societyId buildingId flatId createdBy")
        .lean();
      if (!notice) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: notice });
    }

    let finalQuery = { $and: [baseQuery, expiryCondition] };
    if (search) {
      const searchCondition = {
        $or: [
          { title: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } }
        ]
      };
      finalQuery = { $and: [baseQuery, expiryCondition, searchCondition] };
    }

    const skip = (page - 1) * limit;
    const [notices, total] = await Promise.all([
      Notice.find(finalQuery)
        .populate("societyId buildingId flatId createdBy")
        .sort({ pinned: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notice.countDocuments(finalQuery),
    ]);

    return NextResponse.json({
      success: true,
      data: notices,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error: " + err.message }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  if (!hasPermission(user, "Notice", "create")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    let data = await req.json();

    // Convert empty strings to undefined for ObjectId fields
    if (data.buildingId === "") data.buildingId = undefined;
    if (data.flatId === "") data.flatId = undefined;
    if (data.expiryDate === "") delete data.expiryDate;

    if (!data.title || !data.societyId) {
      return NextResponse.json({ success: false, message: "Title and Society are required" }, { status: 400 });
    }

    const notice = new Notice({
      ...data,
      companyId: user.companyId,
      createdBy: user.id,
    });
    await notice.save();

    const populated = await Notice.findById(notice._id)
      .populate("societyId buildingId flatId createdBy")
      .lean();
    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Create failed: " + err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  if (!hasPermission(user, "Notice", "edit")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    let data = await req.json();
    delete data.companyId;
    delete data.createdBy;
    delete data.readBy;

    if (data.buildingId === "") data.buildingId = undefined;
    if (data.flatId === "") data.flatId = undefined;
    if (data.expiryDate === "") delete data.expiryDate;

    const updated = await Notice.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { $set: data },
      { new: true, runValidators: true }
    ).populate("societyId buildingId flatId createdBy");
    if (!updated) return NextResponse.json({ success: false, message: "Notice not found" }, { status: 404 });
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
  if (!hasPermission(user, "Notice", "delete")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const deleted = await Notice.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}