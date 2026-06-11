import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/CustomerModel";
import Company from "@/models/Company";
import MobileOTP from "@/models/MobileOTP";
import { signToken } from "@/lib/auth";

export async function POST(req) {
  try {
    await dbConnect();
    const { phone, otp, companySlug } = await req.json();

    if (!phone || !otp || !companySlug) {
      return NextResponse.json({ message: "phone, otp and companySlug are required" }, { status: 400 });
    }

    const company = await Company.findOne({ slug: companySlug });
    if (!company) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }

    const otpRecord = await MobileOTP.findOne({ phone, companyId: company._id });
    if (!otpRecord) {
      return NextResponse.json({ message: "OTP not found. Please request again." }, { status: 400 });
    }
    if (otpRecord.otp !== otp || new Date() > otpRecord.expiresAt) {
      return NextResponse.json({ message: "Invalid or expired OTP. Please request a new OTP." }, { status: 400 });
    }

    const customer = await Customer.findOneAndUpdate(
      { mobilePhone: phone, companyId: company._id },
      { $set: { isMobileVerified: true, mobileRegisteredAt: new Date() } },
      { new: true }
    );
    if (!customer) {
      return NextResponse.json({ message: "Customer not found." }, { status: 404 });
    }

    await MobileOTP.deleteOne({ phone, companyId: company._id });

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
    console.error("[mobile/verify-otp]", err);
    return NextResponse.json({ message: "Server error", error: err.message }, { status: 500 });
  }
}
