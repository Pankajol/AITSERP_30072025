import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ProductionJobCard from "@/models/ppc/ProductionJobCard";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ── Auth helpers (copy from previous routes) ─────────────────────
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = ["admin", "production head", "project manager", "site engineer"];
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some(r => allowedRoles.includes(r.trim().toLowerCase()));
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

function getCompanyId(user) {
  if (user.companyId) return user.companyId;
  if (user.type === "company") return user.id || user._id;
  return user.company || user.company_id || null;
}

// ─── GET ───────────────────────────────────────────────────────────────
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const companyId = getCompanyId(user);
  if (!companyId) return NextResponse.json({ success: false, message: "No company" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const search = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status");
  const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
  const limit = Math.min(parseInt(searchParams.get("limit")) || 50, 100);

  try {
    if (id) {
      const jc = await ProductionJobCard.findOne({ _id: id, companyId })
        .populate("productionOrder", "orderNumber")
        .populate("machine", "name")
        .populate("operator", "name")
        .lean();
      if (!jc) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: jc });
    }

    const query = { companyId };
    if (search) {
      query.$or = [
        { jobCardNo: { $regex: search, $options: "i" } },
        { itemName: { $regex: search, $options: "i" } },
      ];
    }
    if (statusFilter && statusFilter !== "all") query.status = statusFilter;

    const skip = (page - 1) * limit;
    const [jobCards, total] = await Promise.all([
      ProductionJobCard.find(query)
        .populate("productionOrder", "orderNumber")
        .populate("machine", "name")
        .populate("operator", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductionJobCard.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: jobCards,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ─── POST ──────────────────────────────────────────────────────────────
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const companyId = getCompanyId(user);
  if (!companyId) return NextResponse.json({ success: false, message: "No company" }, { status: 400 });

  try {
    const body = await req.json();
    if (!body.productionOrder || !body.itemCode || !body.quantity) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }
    if (!body.jobCardNo) {
      const count = await ProductionJobCard.countDocuments({ companyId });
      body.jobCardNo = `PJC-${String(count + 1).padStart(5, "0")}`;
    } else {
      const exists = await ProductionJobCard.findOne({ jobCardNo: body.jobCardNo, companyId });
      if (exists) return NextResponse.json({ success: false, message: "Duplicate job card number" }, { status: 409 });
    }
    const data = { ...body, companyId, createdBy: user.id || user._id };
    const jc = new ProductionJobCard(data);
    await jc.save();
    return NextResponse.json({ success: true, data: jc, message: "Job card created" }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ─── PUT ───────────────────────────────────────────────────────────────
export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const companyId = getCompanyId(user);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

  const body = await req.json();
  delete body.companyId;
  delete body._id;

  const updated = await ProductionJobCard.findOneAndUpdate(
    { _id: id, companyId },
    { $set: body },
    { new: true, runValidators: true }
  );
  if (!updated) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: updated, message: "Updated" });
}

// ─── PATCH (advance) ───────────────────────────────────────────────────
export async function PATCH(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const companyId = getCompanyId(user);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const action = searchParams.get("action");

  if (!id || !action) return NextResponse.json({ success: false, message: "Missing parameters" }, { status: 400 });

  try {
    const jc = await ProductionJobCard.findOne({ _id: id, companyId });
    if (!jc) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    const validTransitions = {
      "Planned": "In Progress",
      "In Progress": "QC",
      "QC": "Completed",
      "Completed": "Ready",
      "Ready": "Delivered",
    };

    if (action === "advance") {
      const nextStatus = validTransitions[jc.status];
      if (!nextStatus) return NextResponse.json({ success: false, message: "Cannot advance further" });
      jc.status = nextStatus;
      await jc.save();
      return NextResponse.json({ success: true, data: jc, message: `Advanced to ${nextStatus}` });
    }

    if (action === "setStatus") {
      const { newStatus } = await req.json();
      jc.status = newStatus;
      await jc.save();
      return NextResponse.json({ success: true, data: jc });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}