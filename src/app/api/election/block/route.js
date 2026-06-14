// app/api/election/block/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Block from "@/models/election/Block";
import Constituency from "@/models/election/Constituency";
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

  if (!hasPermission(user, "Blocks", "view")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const constituencyId = searchParams.get("constituency");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";

    if (id) {
      const block = await Block.findOne({ _id: id, companyId: user.companyId })
        .populate("assignedAgent", "name email")
        .populate("incharge", "name email")
        .populate("constituency", "name")
        .lean();
      if (!block) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: block });
    }

    const query = { companyId: user.companyId };
    if (constituencyId) query.constituency = constituencyId;
    if (search) {
      query.$or = [
        { blockNumber: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [blocks, total] = await Promise.all([
      Block.find(query)
        .populate("assignedAgent", "name")
        .populate("incharge", "name")
        .populate("constituency", "name")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Block.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: blocks,
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

  if (!hasPermission(user, "Blocks", "create")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await req.json();
    const payload = { ...data };
    if (payload.totalVoters != null) payload.totalVoters = Number(payload.totalVoters) || 0;
    if (payload.address?.location?.coordinates) {
      payload.address = {
        ...payload.address,
        location: {
          type: payload.address.location.type || "Point",
          coordinates: payload.address.location.coordinates.map(coord => Number(coord) || 0),
        },
      };
    }

    const required = ["blockNumber", "constituency"];
    for (const field of required) {
      if (!payload[field]) {
        return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
      }
    }

    const block = new Block({
      ...payload,
      companyId: user.companyId,
      createdBy: user.id,
    });
    await block.save();

    // Add block to constituency's blocks array (add field to Constituency model)
    await Constituency.findByIdAndUpdate(data.constituency, {
      $push: { blocks: block._id },
    });

    return NextResponse.json({ success: true, data: block }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to create block" }, { status: 500 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Blocks", "edit")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const data = await req.json();
    const payload = { ...data };
    if (payload.totalVoters != null) payload.totalVoters = Number(payload.totalVoters) || 0;
    if (payload.address?.location?.coordinates) {
      payload.address = {
        ...payload.address,
        location: {
          type: payload.address.location.type || "Point",
          coordinates: payload.address.location.coordinates.map(coord => Number(coord) || 0),
        },
      };
    }

    const updated = await Block.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { ...payload },
      { new: true, runValidators: true }
    );
    if (!updated) return NextResponse.json({ success: false, message: "Block not found" }, { status: 404 });
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

  if (!hasPermission(user, "Blocks", "delete")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const block = await Block.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!block) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    await Constituency.findByIdAndUpdate(block.constituency, {
      $pull: { blocks: block._id },
    });

    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}