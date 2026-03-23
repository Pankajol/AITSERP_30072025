import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Employee from "@/models/hr/Employee";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req) {
  try {
    await connectDB();

    const { email, password } = await req.json();

    const employee = await Employee.findOne({ email });

    if (!employee) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(password, employee.password);

    if (!isMatch) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const token = jwt.sign(
      {
        id: employee._id,
        role: "employee",
        companyId: employee.companyId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return NextResponse.json({
      token,
      employee, // ✅ IMPORTANT
    });

  } catch (error) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}