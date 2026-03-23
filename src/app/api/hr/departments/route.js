import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Department from "@/models/hr/Department";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

/* =========================
   GET → All Departments
========================= */
export async function GET(req) {
  try {
    await connectDB();

    const user = verifyJWT(getTokenFromHeader(req));

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 🔐 permission check
    if (!hasPermission(user, "employees", "view")) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const departments = await Department.find({
      companyId: user.companyId,
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: departments,
    });

  } catch (err) {
    console.error("GET Departments Error:", err);

    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/* =========================
   POST → Create Department
========================= */
export async function POST(req) {
  try {
    await connectDB();

    const user = verifyJWT(getTokenFromHeader(req));

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 🔐 permission check
    if (!hasPermission(user, "employees", "create")) {
      return NextResponse.json(
        { success: false, message: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Department name is required" },
        { status: 400 }
      );
    }

    // ❌ Duplicate check
    const exists = await Department.findOne({
      companyId: user.companyId,
      name,
    });

    if (exists) {
      return NextResponse.json(
        { success: false, message: "Department already exists" },
        { status: 400 }
      );
    }

    // ✅ Create department
    const department = await Department.create({
      companyId: user.companyId,
      name,
      description,
    });

    return NextResponse.json(
      { success: true, data: department },
      { status: 201 }
    );

  } catch (err) {
    console.error("POST Department Error:", err);

    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}