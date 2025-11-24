import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

import Employee from "@/models/hr/Employee";
import Attendance from "@/models/hr/Attendance";
import Leave from "@/models/hr/Leave";
import Payroll from "@/models/hr/Payroll";

export async function GET(req) {
  try {
    await connectDB();

    const token = getTokenFromHeader(req);
    const user = verifyJWT(token);

    if (!user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = user.companyId;

    const totalEmployees = await Employee.countDocuments({ companyId, status: "Active" });

    const today = new Date().toISOString().slice(0, 10);

    const presentToday = await Attendance.countDocuments({
      companyId,
      date: today,
      status: "Present",
    });

    const absentToday = await Attendance.countDocuments({
      companyId,
      date: today,
      status: "Absent",
    });

    const onLeaveToday = await Leave.countDocuments({
      companyId,
      status: "Approved",
      fromDate: { $lte: new Date() },
      toDate: { $gte: new Date() },
    });

    const month =
      new Date().getFullYear() +
      "-" +
      String(new Date().getMonth() + 1).padStart(2, "0");

    const payroll = await Payroll.aggregate([
      { $match: { companyId, month } },
      { $group: { _id: null, total: { $sum: "$netSalary" } } },
    ]);

    return NextResponse.json({
      employees: {
        active: totalEmployees,
        changeText: "Company active employees",
      },
      attendance: {
        present: presentToday,
        leave: onLeaveToday,
        absent: absentToday,
        presentHint: "Present today",
        leaveHint: "On leave today",
      },
      payroll: {
        total: payroll[0]?.total || 0,
        statusText: `For ${month}`,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
