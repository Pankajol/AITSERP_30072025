import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
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

  if (!hasPermission(user, "Society", "view")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";
    const siteType = searchParams.get("siteType") || "";

    let query = { companyId: user.companyId };

    if (id) {
      const society = await Society.findOne({ _id: id, companyId: user.companyId }).lean();
      if (!society) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: society });
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { "address.city": { $regex: search, $options: "i" } },
      ];
    }

    if (siteType) query.siteType = siteType;

    const skip = (page - 1) * limit;
    const [societies, total] = await Promise.all([
      Society.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      Society.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: societies,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Society GET error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Society", "create")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await req.json();
    if (!data.name || !data.siteType) {
      return NextResponse.json({ success: false, message: "name and siteType are required" }, { status: 400 });
    }

    // Auto-generate code if not provided
    if (!data.code) {
      const count = await Society.countDocuments({ companyId: user.companyId });
      data.code = `${data.siteType.substring(0, 3).toUpperCase()}${String(count + 1).padStart(4, "0")}`;
    }

    const society = new Society({ ...data, companyId: user.companyId });
    await society.save();
    return NextResponse.json({ success: true, data: society }, { status: 201 });
  } catch (err) {
    console.error("Society POST error:", err);
    if (err.code === 11000) {
      return NextResponse.json({ success: false, message: "Duplicate code or name" }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Failed to create society" }, { status: 500 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Society", "edit")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const data = await req.json();
    delete data.companyId; // prevent overwriting agency

    const updated = await Society.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!updated) return NextResponse.json({ success: false, message: "Society not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("Society PUT error:", err);
    return NextResponse.json({ success: false, message: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Society", "delete")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const deleted = await Society.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("Society DELETE error:", err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}