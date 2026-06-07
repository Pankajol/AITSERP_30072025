import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Flat from "@/models/society/Flat";
import Society from "@/models/society/Society";
import Building from "@/models/society/Building";
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
  // ✅ Residents can view flats, skip permission check
  if (!isResident && !hasPermission(user, "Flat", "view")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const societyId = searchParams.get("societyId");
    const buildingId = searchParams.get("buildingId");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";

    let query = { companyId: user.companyId };
    if (societyId) query.societyId = societyId;
    if (buildingId) query.buildingId = buildingId;

    // For residents, restrict to their society (if available)
    if (isResident && user.societyId) query.societyId = user.societyId;

    if (id) {
      const flat = await Flat.findOne({ _id: id, ...query })
        .populate("societyId", "name")
        .populate("buildingId", "name")
        .lean();
      if (!flat) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: flat });
    }

    if (search) {
      query.$or = [
        { flatNumber: { $regex: search, $options: "i" } },
        { floor: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [flats, total] = await Promise.all([
      Flat.find(query)
        .populate("societyId", "name")
        .populate("buildingId", "name")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Flat.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: flats,
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
  if (!hasPermission(user, "Flat", "create")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  try {
    const data = await req.json();
    if (!data.flatNumber || !data.societyId || !data.buildingId) {
      return NextResponse.json({ success: false, message: "flatNumber, societyId, buildingId required" }, { status: 400 });
    }
    const flat = new Flat({ ...data, companyId: user.companyId });
    await flat.save();
    const populated = await Flat.findById(flat._id).populate("societyId", "name").populate("buildingId", "name").lean();
    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, message: "Create failed" }, { status: 500 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  if (!hasPermission(user, "Flat", "edit")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });
    const data = await req.json();
    delete data.companyId;
    const updated = await Flat.findOneAndUpdate({ _id: id, companyId: user.companyId }, { $set: data }, { new: true }).populate("societyId", "name").populate("buildingId", "name");
    if (!updated) return NextResponse.json({ success: false, message: "Flat not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json({ success: false, message: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  if (!hasPermission(user, "Flat", "delete")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });
    const deleted = await Flat.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}