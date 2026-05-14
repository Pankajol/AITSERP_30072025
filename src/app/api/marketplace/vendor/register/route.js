import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Vendor from "@/models/marketplace/Vendor";
import bcrypt from "bcryptjs";

export async function POST(req) {
  await dbConnect();
  try {
    const body = await req.json();
    const required = ["businessName", "email", "password"];
    for (const f of required) {
      if (!body[f]) {
        return NextResponse.json({ success: false, message: `${f} is required` }, { status: 400 });
      }
    }

    const exists = await Vendor.findOne({ email: body.email.toLowerCase() });
    if (exists) {
      return NextResponse.json({ success: false, message: "Email already registered" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);
    const vendor = new Vendor({
      companyId: body.companyId,          // यह एडमिन के टोकन से लें या रिक्वेस्ट में भेजें
      businessName: body.businessName,
      email: body.email.toLowerCase(),
      password: hashedPassword,
      phone: body.phone,
      category: body.category || [],
      commissionPercent: body.commissionPercent || 10,
      status: "pending",                 // admin approval required
      address: body.address,
      bankDetails: body.bankDetails,
    });
    await vendor.save();
    return NextResponse.json({ success: true, message: "Registration submitted for approval" }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}