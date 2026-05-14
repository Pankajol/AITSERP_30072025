import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Employee from "@/models/hr/Employee";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

export async function GET(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    const user = verifyJWT(token);

    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    if (!hasPermission(user, "employees", "view"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const employee = await Employee.findById(user.employeeId)
      .populate("department", "name")
      .populate("designation", "title");

    return NextResponse.json({ success: true, data: employee });

  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}