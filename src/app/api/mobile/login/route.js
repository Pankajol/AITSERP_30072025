import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/CustomerModel";
import Company from "@/models/Company";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    await dbConnect();
    const { phone, password, companySlug } = await req.json();

    if (!phone || !password || !companySlug) {
      return NextResponse.json({ message: "phone, password and companySlug are required" }, { status: 400 });
    }

    const company = await Company.findOne({ slug: companySlug });
    if (!company) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }

    const customer = await Customer.findOne({
      mobilePhone: phone,
      companyId: company._id,
    }).select("+mobilePassword");

    if (!customer) {
      return NextResponse.json(
        { message: "No account found with this phone. Please register." },
        { status: 404 }
      );
    }

    if (!customer.isMobileVerified) {
      return NextResponse.json(
        { message: "Phone not verified. Please complete OTP verification." },
        { status: 403 }
      );
    }

    const isMatch = await bcrypt.compare(password, customer.mobilePassword);
    if (!isMatch) {
      return NextResponse.json({ message: "Incorrect password." }, { status: 401 });
    }

    const authToken = signToken({
      _id: customer._id,
      fullName: customer.customerName,
      email: customer.emailId || "",
      type: "customer",
      companyId: company._id,
      role: { name: "customer" },
      permissions: {},
      modules: {},
    });

    return NextResponse.json({
      authToken,
      user: {
        _id:         customer._id,
        fullName:    customer.customerName,
        phone:       customer.mobilePhone,
        role:        "customer",
        companyId:   company._id,
        companyName: company.companyName || company.name,
      },
    });
  } catch (err) {
    console.error("[mobile/login]", err);
    return NextResponse.json({ message: "Server error", error: err.message }, { status: 500 });
  }
}
