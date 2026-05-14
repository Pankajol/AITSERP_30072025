import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import Employee from "@/models/hr/Employee";
import CompanyUser from "@/models/CompanyUser";
import LeaveBalance from "@/models/hr/LeaveBalance";
import bcrypt from "bcryptjs";

export async function GET(req) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "employees", "read"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const query = { companyId: user.companyId };
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { fullName:     { $regex: search, $options: "i" } },
        { email:        { $regex: search, $options: "i" } },
        { employeeCode: { $regex: search, $options: "i" } },
      ];
    }

    const employees = await Employee.find(query)
      .populate("department", "name")
      .populate("designation", "title")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: employees });
  } catch (err) {
    console.error("GET /api/hr/employees error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();

    const user = verifyJWT(getTokenFromHeader(req));
    if (!user)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "employees", "create"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const body = await req.json();

    // ✅ Step 1: Duplicate email check
    const existingUser = await CompanyUser.findOne({ email: body.email });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "User with this email already exists" },
        { status: 400 }
      );
    }

    // ✅ Step 2: Create Employee first — baaki sab iske baad
    const employee = await Employee.create({
      ...body,
      companyId: user.companyId,
    });

    // ✅ Step 3: Create LeaveBalance — employee._id ab available hai
    // ❌ Bug was: LeaveBalance.create() was called BEFORE Employee.create()
    //    so `employee` variable was not yet defined → ReferenceError
    await LeaveBalance.create({
      companyId:  user.companyId,
      employeeId: employee._id,
    });

    // ✅ Step 4: Hash password
    const defaultPassword = "123456";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // ✅ Step 5: Create CompanyUser with salary module included
    await CompanyUser.create({
      companyId:  user.companyId,
      employeeId: employee._id,
      name:       employee.fullName,
      email:      employee.email,
      password:   hashedPassword,
      roles:      ["Employee"],
      modules: {
        employees: {
          selected: true,
          permissions: { view: true, create: false, edit: false, delete: false },
        },
        attendance: {
          selected: true,
          permissions: { view: true, create: true, edit: false, delete: false },
        },
        leaves: {
          selected: true,
          permissions: { view: true, create: true, edit: false, delete: false },
        },
        payroll: {
          selected: true,
          permissions: { view: true, create: false, edit: false, delete: false },
        },
        // ✅ salary module add kiya — pehle missing tha
        // Isliye employee login karne ke baad salary sidebar mein nahi dikhti thi
        salary: {
          selected: true,
          permissions: { view: true, create: false, edit: false, delete: false },
        },
      },
    });

    return NextResponse.json(
      { success: true, data: employee },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/hr/employees error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}