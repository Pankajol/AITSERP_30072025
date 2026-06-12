// src/app/api/mobile/request-otp/route.js
// Resend OTP endpoint (used for OTP resend on register screen)
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/CustomerModel";
import Company from "@/models/Company";
import MobileOTP from "@/models/MobileOTP";
import { sendOTP } from "@/lib/sms";

export async function POST(req) {
  try {
    await dbConnect();
    const { phone, companySlug } = await req.json();

    if (!phone || !companySlug) {
      return NextResponse.json({ message: "phone and companySlug are required" }, { status: 400 });
    }

    // 1. Find company by slug
    const company = await Company.findOne({ slug: companySlug });
    if (!company) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }

    // 2. Check if this customer is already registered
    const existingCustomer = await Customer.findOne({
      mobilePhone: phone,
      companyId: company._id,
      isMobileVerified: true,
    });

    // 3. Generate and save OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await MobileOTP.findOneAndUpdate(
      { phone, companyId: company._id },
      { otp, expiresAt },
      { upsert: true }
    );

    // Send OTP via SMS (Fast2SMS in production, console log in dev)
    await sendOTP(phone, otp);

    const isDev = process.env.NODE_ENV !== 'production';

    return NextResponse.json({
      message: existingCustomer
        ? "OTP sent to your registered number"
        : "OTP sent. Please complete registration after verification.",
      phone,
      companyName: company.companyName,
      maskedPhone: `${phone.substring(0, 2)}****${phone.substring(6)}`,
      isExistingUser: !!existingCustomer,
      ...(isDev && { devOtp: otp }),  // ← Remove in production
    });
  } catch (err) {
    console.error("[mobile/request-otp]", err);
    return NextResponse.json({ message: "Server error", error: err.message }, { status: 500 });
  }
}
