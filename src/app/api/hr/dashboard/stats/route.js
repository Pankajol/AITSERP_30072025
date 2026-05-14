import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Employee   from "@/models/hr/Employee";
import Attendance from "@/models/hr/Attendance";
import Leave      from "@/models/hr/Leave";
import Payroll    from "@/models/hr/Payroll";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const today = new Date().toISOString().slice(0, 10);   // YYYY-MM-DD
    const month = new Date().toISOString().slice(0, 7);    // YYYY-MM

    const [
      totalEmployees,
      activeEmployees,
      presentToday,
      absentToday,
      halfDayToday,
      geoViolationToday,
      onLeaveToday,
      pendingLeaves,
      payrollAgg,
      paidPayrollAgg,
      newJoineesThisMonth,
    ] = await Promise.all([
      Employee.countDocuments({ companyId: user.companyId }),
      Employee.countDocuments({ companyId: user.companyId, status: "Active" }),
      Attendance.countDocuments({ companyId: user.companyId, date: today, status: "Present" }),
      Attendance.countDocuments({ companyId: user.companyId, date: today, status: "Absent" }),
      Attendance.countDocuments({ companyId: user.companyId, date: today, status: "Half Day" }),
      Attendance.countDocuments({ companyId: user.companyId, date: today, status: "Geo-Violation" }),
      Leave.countDocuments({
        companyId: user.companyId,
        status: "Approved",
        fromDate: { $lte: new Date(today) },
        toDate:   { $gte: new Date(today) },
      }),
      Leave.countDocuments({ companyId: user.companyId, status: "Pending" }),
      Payroll.aggregate([
        { $match: { companyId: user.companyId, month } },
        { $group: { _id: null, total: { $sum: "$netSalary" } } },
      ]),
      Payroll.aggregate([
        { $match: { companyId: user.companyId, month, paidStatus: "Paid" } },
        { $group: { _id: null, total: { $sum: "$netSalary" } } },
      ]),
      Employee.countDocuments({
        companyId: user.companyId,
        joiningDate: { $regex: `^${month}` },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        presentToday,
        absentToday,
        halfDayToday,
        geoViolationToday,
        onLeaveToday,
        pendingLeaves,
        monthPayroll:     payrollAgg[0]?.total     || 0,
        monthPayrollPaid: paidPayrollAgg[0]?.total || 0,
        newJoineesThisMonth,
      },
    });
  } catch (err) {
    console.error("GET /api/hr/dashboard/stats error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}