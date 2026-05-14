import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Leave from "@/models/hr/Leave";
import Notification from "@/models/Notification";
import CompanyUser from "@/models/CompanyUser";
import LeaveBalance from "@/models/hr/LeaveBalance"; // ✅ NEW
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

/* =========================
   PATCH → Approve / Reject
========================= */
export async function PATCH(req, context) {
  try {
    await connectDB();

    const { id } = context.params; // ✅ FIX (Next.js)

    const user = verifyJWT(getTokenFromHeader(req));

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 🔐 Permission check
    if (!hasPermission(user, "leaves", "approve")) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const { status, reason } = await req.json();

    if (!["Approved", "Rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid status" },
        { status: 400 }
      );
    }

    // 🔍 Find leave
    const leave = await Leave.findById(id);

    if (!leave) {
      return NextResponse.json(
        { success: false, message: "Leave not found" },
        { status: 404 }
      );
    }

    // ❌ Already processed
    if (leave.status !== "Pending") {
      return NextResponse.json(
        { success: false, message: "Already processed" },
        { status: 400 }
      );
    }

    // 🔄 Update leave
    leave.status = status;
    leave.rejectionReason = reason || "";
    leave.approvedBy = user.id;

    await leave.save();

    // =========================
    // 🎯 1. LEAVE BALANCE (FIXED)
    // =========================
    if (status === "Approved") {
      const balance = await LeaveBalance.findOne({
        employeeId: leave.employeeId,
      });

      if (balance) {
        const days =
          Math.ceil(
            (new Date(leave.toDate) - new Date(leave.fromDate)) /
              (1000 * 60 * 60 * 24)
          ) + 1;

        if (leave.leaveType === "Casual") {
          balance.casual -= days;
        }

        if (leave.leaveType === "Sick") {
          balance.sick -= days;
        }

        if (leave.leaveType === "Paid") {
          balance.paid -= days;
        }

        if (leave.leaveType === "Unpaid") {
          balance.unpaid += days;
        }

        await balance.save();
      }
    }

    // =========================
    // 🔔 2. NOTIFICATION
    // =========================
    const empUser = await CompanyUser.findOne({
      employeeId: leave.employeeId,
    });

    if (empUser) {
      await Notification.create({
        companyId: user.companyId,
        userId: empUser._id,

        title: "Leave Update",

        message:
          status === "Approved"
            ? `Your leave has been approved ✅`
            : `Your leave has been rejected ❌ ${
                reason ? `- ${reason}` : ""
              }`,

        type: "leave",
        referenceId: leave._id,
        referenceModel: "Leave",
      });
    }

    return NextResponse.json({
      success: true,
      data: leave,
    });

  } catch (err) {
    console.error("PATCH /api/hr/leaves ERROR:", err);

    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}