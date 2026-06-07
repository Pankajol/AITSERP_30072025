import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import VisitorPass from "@/models/society/VisitorPass";
import Society from "@/models/society/Society";
import Building from "@/models/society/Building";
import Flat from "@/models/society/Flat";
import Resident from "@/models/society/Resident";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

async function getUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  const user = await verifyJWT(token);
  if (!user) return { error: "Invalid token", status: 401 };
  return { user };
}

function isResident(user) {
  return user.role === "Resident" || user.roles?.includes("Resident");
}

async function updateExpiredStatus() {
  await VisitorPass.updateMany(
    { validTill: { $lt: new Date() }, status: { $ne: "Expired" } },
    { $set: { status: "Expired" } }
  );
}

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const isRes = isResident(user);
  if (!isRes && !hasPermission(user, "Visitor Pass", "view")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    await updateExpiredStatus();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const societyId = searchParams.get("societyId");
    const statusFilter = searchParams.get("status");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";

    let query = { companyId: user.companyId };
    if (societyId) query.societyId = societyId;
    if (statusFilter) query.status = statusFilter;

    if (isRes) {
      const resident = await Resident.findOne({ email: user.email, companyId: user.companyId });
      if (resident) {
        query.$or = [{ residentId: resident._id }, { flatId: { $in: resident.flatIds } }];
      } else {
        return NextResponse.json({ success: true, data: [], meta: { total: 0 } });
      }
    }

    if (id) {
      const pass = await VisitorPass.findOne({ _id: id, ...query })
        .populate("societyId buildingId residentId flatId approvedBy")
        .lean();
      if (!pass) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: pass });
    }

    if (search) {
      query.$or = [
        { visitorName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { vehicleNumber: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [passes, total] = await Promise.all([
      VisitorPass.find(query)
        .populate("societyId buildingId residentId flatId approvedBy")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      VisitorPass.countDocuments(query),
    ]);
    return NextResponse.json({ success: true, data: passes, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("GET error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const isRes = isResident(user);
  if (!isRes && !hasPermission(user, "Visitor Pass", "create")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    let data = await req.json();
    console.log("Received POST data:", data);

    if (!data.societyId || !data.visitorName || !data.validFrom || !data.validTill) {
      return NextResponse.json({ success: false, message: "Missing required fields: societyId, visitorName, validFrom, validTill" }, { status: 400 });
    }

    // For residents, auto-fill residentId, flatId, buildingId from their profile
    if (isRes && !data.residentId) {
      const resident = await Resident.findOne({ email: user.email, companyId: user.companyId })
        .populate("flatIds");
      if (resident) {
        data.residentId = resident._id;
        if (resident.flatIds && resident.flatIds.length > 0) {
          const firstFlat = resident.flatIds[0];
          data.flatId = firstFlat._id;
          data.buildingId = firstFlat.buildingId?._id || firstFlat.buildingId;
        } else {
          return NextResponse.json({ success: false, message: "You have no flats assigned. Contact admin." }, { status: 400 });
        }
      } else {
        return NextResponse.json({ success: false, message: "Resident profile not found." }, { status: 400 });
      }
    }

    // Clean up empty strings
    if (data.buildingId === "" || data.buildingId === "undefined") data.buildingId = undefined;
    if (data.flatId === "" || data.flatId === "undefined") data.flatId = undefined;
    if (data.residentId === "" || data.residentId === "undefined") data.residentId = undefined;

    if (!data.flatId) {
      return NextResponse.json({ success: false, message: "Flat ID is required" }, { status: 400 });
    }

    const pass = new VisitorPass({
      ...data,
      companyId: user.companyId,
      status: "Pending",
    });
    await pass.save();
    const populated = await VisitorPass.findById(pass._id)
      .populate("societyId buildingId residentId flatId approvedBy")
      .lean();
    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (err) {
    console.error("POST error:", err);
    return NextResponse.json({ success: false, message: "Create failed: " + err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  if (!hasPermission(user, "Visitor Pass", "edit")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });
    let data = await req.json();
    delete data.companyId;
    if (data.status === "Approved") { data.approvedBy = user.id; data.approvedAt = new Date(); }
    if (data.status === "Used") data.usedAt = new Date();
    if (data.buildingId === "") data.buildingId = undefined;
    if (data.flatId === "") data.flatId = undefined;
    if (data.residentId === "") data.residentId = undefined;
    const updated = await VisitorPass.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { $set: data },
      { new: true }
    ).populate("societyId buildingId residentId flatId approvedBy");
    if (!updated) return NextResponse.json({ success: false, message: "Pass not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("PUT error:", err);
    return NextResponse.json({ success: false, message: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  if (!hasPermission(user, "Visitor Pass", "delete")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });
    const deleted = await VisitorPass.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("DELETE error:", err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}