import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Employee from "@/models/hr/Employee";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json({ success: false }, { status: 401 });

    const decoded = verifyJWT(token);
    const companyId = decoded.companyId;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    const employees = await Employee.find({
      companyId,
      status: "Active",
      $or: [
        { fullName: { $regex: q, $options: "i" } },
        { employeeCode: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    })
      .select("_id fullName employeeCode email")
      .limit(10)
      .sort({ fullName: 1 });

    return NextResponse.json({
      success: true,
      data: employees,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
