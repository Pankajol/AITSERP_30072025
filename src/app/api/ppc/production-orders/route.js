import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ProductionOrder from "@/models/ppc/ProductionOrder";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth helpers ─────────────────────────────────────────────────────────
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = [
    "admin", "sales manager", "purchase manager", "inventory manager",
    "accounts manager", "hr manager", "support executive",
    "production head", "project manager",
  ];
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

function getCompanyId(user) {
  if (user.companyId) return user.companyId;
  if (user.type === "company") return user.id || user._id;
  return user.company || user.company_id || null;
}

// ─── GET ──────────────────────────────────────────────────────────────────
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const companyId = getCompanyId(user);
  if (!companyId) return NextResponse.json({ success: false, message: "No company identifier" }, { status: 400 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const search = searchParams.get("search") || "";
    const statusFilter = searchParams.get("status");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 50, 100);

    if (id) {
      const order = await ProductionOrder.findOne({ _id: id, companyId })
        .populate("assignedMachine", "name code")
        .populate("assignedOperator", "name operatorCode")
        .populate("assignedResource", "name code")
        .lean();
      if (!order) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: order });
    }

    const query = { companyId };
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { itemName: { $regex: search, $options: "i" } },
      ];
    }
    if (statusFilter && statusFilter !== "all") query.status = statusFilter;

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      ProductionOrder.find(query)
        .populate("assignedMachine", "name code")
        .populate("assignedOperator", "name operatorCode")
        .populate("assignedResource", "name code")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductionOrder.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: orders,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("GET production-orders error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const companyId = getCompanyId(user);
  if (!companyId) return NextResponse.json({ success: false, message: "No company identifier" }, { status: 400 });

  try {
    const body = await req.json();
    const {
      orderNumber,
      itemCode,
      itemName,
      quantity,
      status: orderStatus,
      assignedMachine,
      assignedOperator,
      assignedResource,
    } = body;

    if (!orderNumber || !itemCode || !itemName || !quantity) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const existing = await ProductionOrder.findOne({ orderNumber, companyId });
    if (existing) return NextResponse.json({ success: false, message: "Order number already exists" }, { status: 409 });

    const data = {
      companyId,
      orderNumber,
      itemCode,
      itemName,
      quantity: parseInt(quantity),
      status: orderStatus || "Pending",
      assignedMachine: assignedMachine || null,
      assignedOperator: assignedOperator || null,
      assignedResource: assignedResource || null,
      createdBy: user.id || user._id,
    };

    const order = new ProductionOrder(data);
    await order.save();
    return NextResponse.json({ success: true, data: order, message: "Production order created" }, { status: 201 });
  } catch (err) {
    console.error("POST production-orders error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ─── PUT ─────────────────────────────────────────────────────────────────
export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const companyId = getCompanyId(user);
  if (!companyId) return NextResponse.json({ success: false, message: "No company identifier" }, { status: 400 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const body = await req.json();
    delete body.companyId;
    delete body._id;

    const updated = await ProductionOrder.findOneAndUpdate(
      { _id: id, companyId },
      { $set: body },
      { new: true, runValidators: true }
    )
      .populate("assignedMachine", "name code")
      .populate("assignedOperator", "name operatorCode")
      .populate("assignedResource", "name code");

    if (!updated) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated, message: "Updated" });
  } catch (err) {
    console.error("PUT production-orders error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────
export async function DELETE(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const companyId = getCompanyId(user);
  if (!companyId) return NextResponse.json({ success: false, message: "No company identifier" }, { status: 400 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const deleted = await ProductionOrder.findOneAndDelete({ _id: id, companyId });
    if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("DELETE production-orders error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}