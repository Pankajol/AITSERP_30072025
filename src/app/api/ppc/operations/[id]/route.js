import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Operator from "@/models/ppc/Operator";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth Helper (same as above) ──────────────────────────────────────────
function isAuthorized(user) { /* same as above */ }
async function validateUser(req) { /* same as above */ }

// ─── GET: Single Operator ──────────────────────────────────────────────────
export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const operator = await Operator.findOne({ _id: params.id, company: user.companyId })
      .populate("employeeId", "name email")
      .populate("labourId", "name skill")
      .lean();
    if (!operator) {
      return NextResponse.json({ success: false, message: "Operator not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: operator });
  } catch (err) {
    console.error("GET /api/ppc/operators/[id] error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ─── PUT: Update Operator ──────────────────────────────────────────────────
export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();

    // Check duplicate operatorCode if being changed
    if (body.operatorCode) {
      const existing = await Operator.findOne({
        operatorCode: body.operatorCode,
        company: user.companyId,
        _id: { $ne: params.id },
      });
      if (existing) {
        return NextResponse.json(
          { success: false, message: `Operator code '${body.operatorCode}' already exists` },
          { status: 409 }
        );
      }
    }

    const updated = await Operator.findOneAndUpdate(
      { _id: params.id, company: user.companyId },
      { ...body, updatedBy: user.id || user._id },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return NextResponse.json({ success: false, message: "Operator not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated, message: "Operator updated successfully" });
  } catch (err) {
    console.error("PUT /api/ppc/operators/[id] error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ─── DELETE: Remove Operator ──────────────────────────────────────────────
export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const deleted = await Operator.findOneAndDelete({ _id: params.id, company: user.companyId });
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Operator not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Operator deleted successfully" });
  } catch (err) {
    console.error("DELETE /api/ppc/operators/[id] error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}