import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import otpGenerator from "otp-generator";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const OTP_STORE = new Map(); // ⚠️ Replace with Redis/DB in production

export async function POST(req) {
  try {
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    await dbConnect();
    const user = await CompanyUser.findById(decoded.id).select("email name");
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const otp = otpGenerator.generate(6, { digits: true, alphabets: false });
    OTP_STORE.set(user.email, { otp, expires: Date.now() + 5 * 60 * 1000 });

    // TODO: Send via email (Nodemailer)
    console.log(`OTP for ${user.email}: ${otp}`);

    return NextResponse.json({ message: "OTP sent to your registered email" });
  } catch (e) {
    console.error("Send OTP error:", e);
    return NextResponse.json({ message: e.message }, { status: 401 });
  }
}

export { OTP_STORE }; // So change-password can reuse it
