import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import Employee from "@/models/hr/Employee";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "employees", "read"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const employee = await Employee.findOne({ _id: params.id, companyId: user.companyId })
      .populate("department", "name")
      .populate("designation", "title");

    if (!employee) return NextResponse.json({ success: false, message: "Employee not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: employee });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    
    if (!hasPermission(user, "employees", "update"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    let body = await req.json();

    // 🛠 FIX: Conflict handle karne ke liye hum 'body' ko sanitize karenge
    // Agar body mein dotted strings hain (like "salary.basic"), unhe remove kar denge
    // Kyunki hum nested objects (like salary: { basic: ... }) bhej rahe hain.
    const sanitizedBody = { ...body };
    Object.keys(sanitizedBody).forEach(key => {
      if (key.includes('.')) {
        delete sanitizedBody[key];
      }
    });

    const employee = await Employee.findOneAndUpdate(
      { _id: params.id, companyId: user.companyId },
      { $set: sanitizedBody }, // $set use karna safe hota hai
      { new: true, runValidators: true }
    )
    .populate("department", "name")
    .populate("designation", "title");

    if (!employee) return NextResponse.json({ success: false, message: "Employee not found" }, { status: 404 });
    
    return NextResponse.json({ success: true, data: employee });
  } catch (err) {
    console.error("Update Error:", err.message);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const user = verifyJWT(getTokenFromHeader(req));
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "employees", "delete"))
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    await Employee.findOneAndDelete({ _id: params.id, companyId: user.companyId });
    return NextResponse.json({ success: true, message: "Employee deleted" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}