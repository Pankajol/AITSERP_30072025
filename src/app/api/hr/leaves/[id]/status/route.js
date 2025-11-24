import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Leave from "@/models/hr/Leave";
import LeaveBalance from "@/models/hr/LeaveBalance";
import { withAuth, hasRole } from "@/lib/rbac";
import { sendLeaveMail } from "@/lib/mailer";
import { sendWhatsApp } from "@/lib/whatsapp";

export async function PATCH(req, { params }) {
  const auth = await withAuth(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { user } = auth;
  await connectDB();

  if (!hasRole(user, ["Admin", "HR", "Manager"])) {
    return NextResponse.json(
      { error: "Only Admin / HR / Manager can approve" },
      { status: 403 }
    );
  }

  const { status } = await req.json();
  const leave = await Leave.findById(params.id)
    .populate("employeeId", "fullName email phone")
    .exec();

  if (!leave) {
    return NextResponse.json({ error: "Leave not found" }, { status: 404 });
  }

  leave.status = status;
  leave.approvedBy = user.id;
  await leave.save();

  if (status === "Approved") {
    const days =
      (new Date(leave.toDate) - new Date(leave.fromDate)) /
        (1000 * 60 * 60 * 24) +
      1;

    const balance = await LeaveBalance.findOne({
      companyId: leave.companyId,
      employeeId: leave.employeeId,
    });

    if (balance) {
      if (leave.leaveType === "Casual") balance.casual -= days;
      if (leave.leaveType === "Sick") balance.sick -= days;
      if (leave.leaveType === "Paid") balance.paid -= days;
      if (leave.leaveType === "Unpaid") balance.unpaid += days;
      await balance.save();
    }
  }

  // Email + WhatsApp
  try {
    await sendLeaveMail({
      to: leave.employeeId.email,
      employee: leave.employeeId.fullName,
      status,
      from: leave.fromDate,
      to: leave.toDate,
    });

    await sendWhatsApp({
      to: leave.employeeId.phone,
      message: `Hi ${leave.employeeId.fullName}, your leave request (${leave.leaveType}) from ${leave.fromDate.toISOString().slice(0,10)} to ${leave.toDate.toISOString().slice(0,10)} is ${status}.`,
    });
  } catch (e) {
    console.error("Notification error", e.message);
  }

  return NextResponse.json({ data: leave });
}
