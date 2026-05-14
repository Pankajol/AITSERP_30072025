import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ElectionParty from "@/models/election/ElectionParty";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = ["admin", "election manager", "party head"];
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some(role => allowedRoles.includes(role.trim().toLowerCase()));
}

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
    return { user };
  } catch {
    return { error: "Invalid token", status: 401 };
  }
}

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";

    if (id) {
      const party = await ElectionParty.findOne({ _id: id, companyId: user.companyId })
        .populate("constituency")
        .lean();
      if (!party) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: party });
    }

    const query = { companyId: user.companyId };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { candidateName: { $regex: search, $options: "i" } },
        { acronym: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [parties, total] = await Promise.all([
      ElectionParty.find(query)
        .populate("constituency", "name")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      ElectionParty.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: parties,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const data = await req.json();
    const required = ["name", "candidateName", "electionType"];
    for (const field of required) {
      if (!data[field]) {
        return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
      }
    }

    const party = new ElectionParty({
      ...data,
      companyId: user.companyId,
      createdBy: user.id,
    });
    await party.save();
    return NextResponse.json({ success: true, data: party }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to create party" }, { status: 500 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const data = await req.json();
    const updated = await ElectionParty.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { ...data },
      { new: true, runValidators: true }
    );
    if (!updated) return NextResponse.json({ success: false, message: "Party not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const deleted = await ElectionParty.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}