import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Leave from "@/models/hr/Leave";
import Employee from "@/models/hr/Employee";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

/* =====================================================
   GET → My Leaves (Employee / Agent / Admin / HR)
===================================================== */
export async function GET(req) {
  try {
    await connectDB();

    /* ---------------- AUTH ---------------- */
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = verifyJWT(token);

    /**
     * BLOCK only PURE company login
     * (company token with NO roles)
     */
    if (user.type === "company" && (!user.roles || user.roles.length === 0)) {
      return NextResponse.json(
        { error: "Company has no personal leaves" },
        { status: 403 }
      );
    }

    /* ---------------- RESOLVE EMPLOYEE ---------------- */
    let employeeId = user.employeeId;

    // If employeeId not present in token → find via email
    if (!employeeId) {
      const emp = await Employee.findOne({
        companyId: user.companyId,
        email: user.email,
      }).select("_id");

      if (!emp) {
        return NextResponse.json(
          { error: "Employee profile not linked" },
          { status: 400 }
        );
      }

      employeeId = emp._id;
    }

    /* ---------------- FETCH LEAVES ---------------- */
    const leaves = await Leave.find({
      companyId: user.companyId,
      employeeId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      data: leaves,
    });
  } catch (error) {
    console.error("GET /api/hr/leaves/my error:", error);
    return NextResponse.json(
      { error: "Failed to fetch my leaves" },
      { status: 500 }
    );
  }
}
