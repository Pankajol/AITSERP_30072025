import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Employee from "@/models/hr/Employee";
import jwt from "jsonwebtoken";

export async function POST(req) {
  try {
    await connectDB();

    const { email } = await req.json();

    const employee = await Employee.findOne({ email });

    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    const token = jwt.sign(
      { id: employee._id, type: "employee" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const resetLink = `${process.env.NEXT_PUBLIC_BASE_URL}/employee-reset-password/${token}`;

    console.log("EMPLOYEE RESET LINK:", resetLink);

    return NextResponse.json({ message: "Reset link sent" });
  } catch (err) {
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}