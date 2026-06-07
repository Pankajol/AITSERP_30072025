import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import MaintenanceBill from "@/models/society/MaintenanceBill";
import Society from "@/models/society/Society";
import Building from "@/models/society/Building";
import Flat from "@/models/society/Flat";
import Resident from "@/models/society/Resident";
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

  // ✅ Skip permission check for residents (they only view own bills)
  if (!isResident && !hasPermission(user, "Maintenance Bill", "view")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const societyId = searchParams.get("societyId");
    const buildingId = searchParams.get("buildingId");
    const flatId = searchParams.get("flatId");
    const residentId = searchParams.get("residentId");
    const paymentStatus = searchParams.get("paymentStatus");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";
    const billPeriod = searchParams.get("billPeriod");

    let query = { companyId: user.companyId };
    if (societyId) query.societyId = societyId;
    if (buildingId) query.buildingId = buildingId;
    if (flatId) query.flatId = flatId;
    if (residentId) query.residentId = residentId;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (billPeriod) query.billPeriod = billPeriod;

    // ✅ If user is resident, restrict to their flats
    if (isResident && user.email) {
      const resident = await Resident.findOne({ email: user.email, companyId: user.companyId });
      if (resident && resident.flatIds?.length) {
        query.flatId = { $in: resident.flatIds };
      } else {
        return NextResponse.json({ success: true, data: [], meta: { total: 0 } });
      }
    }

    if (id) {
      const bill = await MaintenanceBill.findOne({ _id: id, ...query })
        .populate("societyId buildingId flatId residentId")
        .lean();
      if (!bill) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: bill });
    }

    if (search) {
      query.$or = [
        { billPeriod: { $regex: search, $options: "i" } },
        { "items.description": { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [bills, total] = await Promise.all([
      MaintenanceBill.find(query)
        .populate("societyId buildingId flatId residentId")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      MaintenanceBill.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: bills,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// POST, PUT, DELETE remain the same (they require explicit permission)
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  if (!hasPermission(user, "Maintenance Bill", "create")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await req.json();
    if (!data.flatId || !data.billPeriod || !data.dueDate || !data.items || !data.totalAmount) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const flat = await Flat.findById(data.flatId).lean();
    if (!flat) return NextResponse.json({ success: false, message: "Flat not found" }, { status: 404 });

    const existing = await MaintenanceBill.findOne({
      flatId: data.flatId,
      billPeriod: data.billPeriod,
      companyId: user.companyId,
    });
    if (existing) {
      return NextResponse.json({ success: false, message: "Bill for this period already exists for this flat" }, { status: 409 });
    }

    const bill = new MaintenanceBill({
      ...data,
      societyId: flat.societyId,
      buildingId: flat.buildingId,
      companyId: user.companyId,
      paymentStatus: data.paymentStatus || "Pending",
      paidAmount: data.paidAmount || 0,
    });
    await bill.save();

    const populated = await MaintenanceBill.findById(bill._id)
      .populate("societyId buildingId flatId residentId")
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
  if (!hasPermission(user, "Maintenance Bill", "edit")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const data = await req.json();
    delete data.companyId;
    delete data.societyId;

    if (data.paymentStatus === "Paid" && !data.paidAt) data.paidAt = new Date();

    const updated = await MaintenanceBill.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { $set: data },
      { new: true, runValidators: true }
    ).populate("societyId buildingId flatId residentId");
    if (!updated) return NextResponse.json({ success: false, message: "Bill not found" }, { status: 404 });
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
  if (!hasPermission(user, "Maintenance Bill", "delete")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const deleted = await MaintenanceBill.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}