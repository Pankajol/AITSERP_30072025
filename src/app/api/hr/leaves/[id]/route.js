import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Leave from "@/models/hr/Leave";
import { withAuth, hasRole } from "@/lib/rbac";

/* ============================
   PUT → Update Leave (Edit)
============================ */
export async function PUT(req, { params }) {
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
    const { id } = params;

    const leave = await Leave.findById(id);
    if (!leave) {
      return NextResponse.json(
        { error: "Leave not found" },
        { status: 404 }
      );
    }

    // 🔐 Permission rules
    const isCompany = user.type === "company";
    const isPrivileged = hasRole(user, ["Admin", "HR", "Manager"]);
    const isOwner =
      leave.employeeId.toString() === user.employeeId?.toString();

    // Employee → only own Pending leave
    if (!isCompany && !isPrivileged) {
      if (!isOwner || leave.status !== "Pending") {
        return NextResponse.json(
          { error: "You are not allowed to edit this leave" },
          { status: 403 }
        );
      }
    }

    const body = await req.json();

    // Allowed fields only
    const allowed = [
      "fromDate",
      "toDate",
      "leaveType",
      "reason",
      "attachmentUrl",
    ];

    allowed.forEach((field) => {
      if (body[field] !== undefined) {
        leave[field] = body[field];
      }
    });

    await leave.save();

    return NextResponse.json({
      message: "Leave updated successfully",
      data: leave,
    });
  } catch (error) {
    console.error("PUT /api/hr/leaves/:id error:", error);

    return NextResponse.json(
      { error: "Failed to update leave" },
      { status: 500 }
    );
  }
}

/* ============================
   PATCH → Update Status
============================ */
export async function PATCH(req, { params }) {
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
    const { id } = params;

    // Only Admin / HR / Manager / Company
    const isCompany = user.type === "company";
    const isPrivileged = hasRole(user, ["Admin", "HR", "Manager"]);

    if (!isCompany && !isPrivileged) {
      return NextResponse.json(
        { error: "Not allowed to change status" },
        { status: 403 }
      );
    }

    const { status } = await req.json();

    if (!["Approved", "Rejected", "Pending"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const leave = await Leave.findByIdAndUpdate(
      id,
      {
        status,
        approvedBy: user.employeeId || null,
      },
      { new: true }
    );

    if (!leave) {
      return NextResponse.json(
        { error: "Leave not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Leave status updated",
      data: leave,
    });
  } catch (error) {
    console.error("PATCH /api/hr/leaves/:id/status error:", error);

    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}
