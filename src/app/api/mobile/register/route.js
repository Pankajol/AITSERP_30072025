import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/CustomerModel";
import Company from "@/models/Company";
import MobileOTP from "@/models/MobileOTP";
import bcrypt from "bcryptjs";
import { sendOTP } from "@/lib/sms";

export async function POST(req) {
  try {
    await dbConnect();
    const { fullName, phone, password, companySlug } = await req.json();

    if (!fullName || !phone || !password || !companySlug) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    // 1. Find company by slug
    const company = await Company.findOne({ slug: companySlug });
    if (!company) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }

    // 2. Check if this phone is already registered and verified
    const existing = await Customer.findOne({
      mobilePhone: phone,
      companyId: company._id,
      isMobileVerified: true,
    });
    if (existing) {
      return NextResponse.json(
        { message: "Phone already registered. Please login." },
        { status: 409 }
      );
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Auto-generate a unique email for mobile users
    //    (CustomerModel requires emailId — mobile users don't have one)
    const autoEmail = `mobile.${phone}@${companySlug}.app`;
    const customerCode = `MOB-${phone}-${company._id.toString().slice(-4)}`;

    // 5. Create or update pending registration (not yet verified)
    try {
      await Customer.findOneAndUpdate(
        { mobilePhone: phone, companyId: company._id },
        {
          $set: {
            customerName: fullName,
            mobilePhone: phone,
            mobilePassword: hashedPassword,
            companyId: company._id,
            isMobileVerified: false,
            customerGroup: "Mobile Customers",
            customerType: "Individual",
          },
          $setOnInsert: {
            customerCode,
            emailId: autoEmail,     // required by schema — set only on first insert
            pan: "PENDING",          // required by schema — will be updated later
            createdAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (dbErr) {
      // Handle duplicate key (user already exists with pending registration)
      if (dbErr.code === 11000) {
        console.log(`[register] Existing pending registration for ${phone}, updating OTP`);
      } else {
        throw dbErr;
      }
    }

    // 6. Generate and store OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await MobileOTP.findOneAndUpdate(
      { phone, companyId: company._id },
      { otp, expiresAt },
      { upsert: true }
    );

    // 7. Send OTP via SMS (Fast2SMS in production, console log in dev)
    await sendOTP(phone, otp);

    const isDev = process.env.NODE_ENV !== 'production';

    return NextResponse.json({
      message: "OTP sent to your mobile number. Please check your SMS.",
      phone,
      ...(isDev && { devOtp: otp }),
    });
  } catch (err) {
    console.error("[mobile/register]", err);
    return NextResponse.json({ message: "Server error", error: err.message }, { status: 500 });
  }
}
