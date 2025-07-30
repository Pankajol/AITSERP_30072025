import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import Supplier from "@/models/SupplierModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function isAuthorized(user) {
  return user?.type === "company" || user?.role === "Admin" || user?.permissions?.includes("supplier");
}

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };

  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
    return { user };
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    return { error: "Invalid token", status: 401 };
  }
}

/* ---------------------------
   GET: Single Supplier
--------------------------- */
export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const supplier = await Supplier.findOne({ _id: params.id, companyId: user.companyId })
      .populate("glAccount", "accountName accountCode");

    if (!supplier) {
      return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: supplier }, { status: 200 });
  } catch (err) {
    console.error("GET single supplier error:", err);
    return NextResponse.json({ success: false, message: "Failed to fetch supplier" }, { status: 500 });
  }
}

/* ---------------------------
   PUT: Update Supplier
--------------------------- */
export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const data = await req.json();

    const updated = await Supplier.findOneAndUpdate(
      { _id: params.id, companyId: user.companyId },
      data,
      { new: true, runValidators: true }
    ).populate("glAccount", "accountName accountCode");

    if (!updated) {
      return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (err) {
    console.error("PUT supplier error:", err);
    return NextResponse.json({ success: false, message: "Failed to update supplier" }, { status: 500 });
  }
}

/* ---------------------------
   DELETE: Remove Supplier
--------------------------- */
export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const deleted = await Supplier.findOneAndDelete({ _id: params.id, companyId: user.companyId });

    if (!deleted) {
      return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Supplier deleted" }, { status: 200 });
  } catch (err) {
    console.error("DELETE supplier error:", err);
    return NextResponse.json({ success: false, message: "Failed to delete supplier" }, { status: 500 });
  }
}
