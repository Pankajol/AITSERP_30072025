import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Vendor from "@/models/marketplace/Vendor";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req) {
  await dbConnect();
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ success: false, message: "Email and password required" }, { status: 400 });
    }

    const vendor = await Vendor.findOne({ email: email.toLowerCase() });
    if (!vendor) {
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
    }
    if (vendor.status !== "active") {
      return NextResponse.json({ success: false, message: "Account not approved yet" }, { status: 403 });
    }

    const isMatch = await bcrypt.compare(password, vendor.password);
    if (!isMatch) {
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
    }

    const token = jwt.sign(
      { id: vendor._id, type: "vendor", companyId: vendor.companyId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json({ success: true, token, vendor: { id: vendor._id, name: vendor.businessName } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}