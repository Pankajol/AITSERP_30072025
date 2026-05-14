import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import Leave from "@/models/hr/Leave";
import LeaveBalance from "@/models/hr/LeaveBalance";

export async function PATCH(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "leaves", "update"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const { status } = await req.json();
    if (!["Approved", "Rejected"].includes(status))
      return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400 });

    const leave = await Leave.findOne({ _id: params.id, companyId: user.companyId });
    if (!leave) return NextResponse.json({ success: false, message: "Leave not found" }, { status: 404 });
    if (leave.status !== "Pending")
      return NextResponse.json({ success: false, message: "Only pending leaves can be actioned" }, { status: 400 });

    leave.status     = status;
    leave.approvedBy = user.id;
    await leave.save();

    // Deduct leave balance when approved
    if (status === "Approved") {
      const days = Math.ceil(
        (new Date(leave.toDate) - new Date(leave.fromDate)) / (1000 * 60 * 60 * 24)
      ) + 1;

      const typeMap = { Casual: "casual", Sick: "sick", Paid: "paid", Unpaid: "unpaid" };
      const field   = typeMap[leave.leaveType];

      if (field && field !== "unpaid") {
        await LeaveBalance.findOneAndUpdate(
          { employeeId: leave.employeeId, companyId: user.companyId },
          { $inc: { [field]: -days } },
          { upsert: true }
        );
      }
    }

    return NextResponse.json({ success: true, data: leave });
  } catch (err) {
    console.error("PATCH /api/hr/leaves/[id]/status error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}