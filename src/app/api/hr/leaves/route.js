import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Leave from "@/models/hr/Leave";
import LeaveBalance from "@/models/hr/LeaveBalance";
import { withAuth, hasRole } from "@/lib/rbac";

/* =======================
   GET → All company leaves
======================= */
export async function GET(req) {
  try {
    await connectDB();

    const auth = await withAuth(req);
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { user } = auth;

    // ✅ Case-safe role check (HR / Admin / Manager)
    if (!hasRole(user, ["Admin", "HR", "Manager"])) {
      return NextResponse.json(
        { error: "Only Admin / HR / Manager can view all leaves" },
        { status: 403 }
      );
    }

    const leaves = await Leave.find({ companyId: user.companyId })
      .populate("employeeId", "fullName email phone")
      .sort({ createdAt: -1 });

    return NextResponse.json({ data: leaves });
  } catch (error) {
    console.error("GET /leaves error:", error.message);

    return NextResponse.json(
      { error: "Failed to fetch leaves" },
      { status: 500 }
    );
  }
}

/* =======================
   POST → Apply leave
======================= */
export async function POST(req) {
  try {
    await connectDB();

    const auth = await withAuth(req);

    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { user } = auth;

    const body = await req.json();

    const {
      fromDate,
      toDate,
      leaveType,
      reason,
      attachmentUrl,
    } = body;

    // ✅ Validation
    if (!fromDate || !toDate || !leaveType || !reason) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (new Date(fromDate) > new Date(toDate)) {
      return NextResponse.json(
        { error: "From date cannot be greater than To date" },
        { status: 400 }
      );
    }

    // ✅ Prevent duplicate leave for same dates
    const existing = await Leave.findOne({
      companyId: user.companyId,
      employeeId: user.id,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
    });

    if (existing) {
      return NextResponse.json(
        { error: "Leave already applied for these dates" },
        { status: 409 }
      );
    }

    // ✅ Create Leave
    const leave = await Leave.create({
      companyId: user.companyId,
      employeeId: user.id,
      fromDate,
      toDate,
      leaveType,
      reason,
      attachmentUrl: attachmentUrl || "",
      status: "Pending",
    });

    // ✅ Ensure Leave Balance exists
    let balance = await LeaveBalance.findOne({
      companyId: user.companyId,
      employeeId: user.id,
    });

    if (!balance) {
      balance = await LeaveBalance.create({
        companyId: user.companyId,
        employeeId: user.id,
      });
    }

    return NextResponse.json({
      message: "Leave applied successfully",
      data: leave,
    });

  } catch (error) {
    console.error("POST /leaves error:", error.message);

    return NextResponse.json(
      { error: "Failed to apply leave" },
      { status: 500 }
    );
  }
}
