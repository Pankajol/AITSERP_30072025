import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Attendance from "@/models/hr/Attendance";
import Salary from "@/models/hr/Salary";

export async function POST(req) {
  await connectDB();

  const { employeeId, month, basicSalary } = await req.json();

  const records = await Attendance.find({
    employeeId,
    date: { $regex: month }, // 2026-03
  });

  let present = 0;
  let half = 0;
  let absent = 0;

  records.forEach(r => {
    if (r.status === "Present") present++;
    else if (r.status === "Half Day") half++;
    else absent++;
  });

  const totalDays = present + half + absent;

  const salary =
    (basicSalary / totalDays) *
    (present + half * 0.5);

  const data = await Salary.create({
    employeeId,
    month,
    basicSalary,
    presentDays: present,
    halfDays: half,
    absentDays: absent,
    totalSalary: Math.round(salary),
  });

  return NextResponse.json({ success: true, data });
}