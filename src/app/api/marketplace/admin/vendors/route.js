import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Vendor from "@/models/marketplace/Vendor";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth"; // आपके एडमिन ऑथ हेल्पर

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = ["admin"];       // केवल admin
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some(role => allowedRoles.includes(role.trim().toLowerCase()));
}

async function validateAdmin(req) {
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
  const { user, error, status } = await validateAdmin(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 50);
    const search = searchParams.get("search") || "";
    const statusFilter = searchParams.get("status");  // pending, active, suspended

    if (id) {
      const vendor = await Vendor.findOne({ _id: id, companyId: user.companyId }).select("-password").lean();
      if (!vendor) return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: vendor });
    }

    const query = { companyId: user.companyId };
    if (statusFilter) query.status = statusFilter;
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [vendors, total] = await Promise.all([
      Vendor.find(query).select("-password").skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
      Vendor.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: vendors,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await validateAdmin(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "Vendor ID required" }, { status: 400 });

    const body = await req.json();
    // एडमिन status और commissionPercent बदल सकता है
    const update = {};
    if (body.status === "active" || body.status === "pending" || body.status === "suspended") {
      update.status = body.status;
    }
    if (body.commissionPercent !== undefined) {
      update.commissionPercent = body.commissionPercent;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, message: "No valid fields to update" }, { status: 400 });
    }

    const vendor = await Vendor.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { $set: update },
      { new: true }
    ).select("-password");

    if (!vendor) return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: vendor });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req) {
  await dbConnect();
  const { user, error, status } = await validateAdmin(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const vendor = await Vendor.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!vendor) return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Vendor deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}