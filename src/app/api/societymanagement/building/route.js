import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Building from "@/models/society/Building";
import Society from "@/models/society/Society";
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

  const isResident = user.role === "Resident" || user.roles?.includes("Resident");
  // ✅ Residents can view buildings of their society
  if (!isResident && !hasPermission(user, "Building", "view")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const societyId = searchParams.get("societyId");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";

    let query = { companyId: user.companyId };
    if (societyId) query.societyId = societyId;
    if (isResident && user.societyId) query.societyId = user.societyId;

    if (id) {
      const building = await Building.findOne({ _id: id, ...query }).populate("societyId").lean();
      if (!building) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: building });
    }
    if (search) query.$or = [{ name: { $regex: search, $options: "i" } }];
    const skip = (page - 1) * limit;
    const [buildings, total] = await Promise.all([
      Building.find(query).populate("societyId").skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      Building.countDocuments(query),
    ]);
    return NextResponse.json({ success: true, data: buildings, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// POST, PUT, DELETE remain similar but require explicit permission (omitted for brevity)
// POST, PUT, DELETE remain similar but require explicit permission (omitted for brevity)

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  if (!hasPermission(user, "Building", "create")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await req.json();
    if (!data.name || !data.societyId) {
      return NextResponse.json({ success: false, message: "Name and societyId required" }, { status: 400 });
    }

    const building = new Building({
      ...data,
      companyId: user.companyId,
    });
    await building.save();

    const populated = await Building.findById(building._id).populate("societyId").lean();
    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Create failed" }, { status: 500 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  if (!hasPermission(user, "Building", "edit")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const data = await req.json();
    delete data.companyId;

    const updated = await Building.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { $set: data },
      { new: true, runValidators: true }
    ).populate("societyId");
    if (!updated) return NextResponse.json({ success: false, message: "Building not found" }, { status: 404 });
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
  if (!hasPermission(user, "Building", "delete")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const deleted = await Building.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}