// 📁 src/app/api/hr/my-salary/route.js
 
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Salary from "@/models/hr/Salary";
 
export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user || !user.employeeId)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
 
    const salaries = await Salary.find({ employeeId: user.employeeId })
      .sort({ year: -1, month: -1 });
 
    return NextResponse.json({ success: true, data: salaries });
  } catch (err) {
    console.error("GET /api/hr/my-salary error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}