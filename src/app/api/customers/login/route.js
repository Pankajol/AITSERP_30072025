import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/CustomerModel";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    // ✅ Validate input
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // ✅ Find customer (password hidden by default so select)
    const customer = await Customer.findOne({
      emailId: email.toLowerCase().trim(),
    }).select("+password");

    if (!customer) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // ✅ Optional portal access check
    if (customer.portalAccess === false) {
      return NextResponse.json(
        { message: "Portal access disabled" },
        { status: 403 }
      );
    }

    // ✅ Password check
    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // ✅ Generate JWT (customer type)
    const token = jwt.sign(
      {
        id: customer._id,
        companyId: customer.companyId,
        email: customer.emailId,
        type: "customer", // 🔥 important for middleware
      },
      SECRET,
      { expiresIn: "1d" }
    );

    // ✅ Remove sensitive fields
    const { password: _, __v, ...safeCustomer } = customer.toObject();

    return NextResponse.json({
      token,
      customer: safeCustomer,
    });
  } catch (error) {
    console.error("Customer Login Error:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}
