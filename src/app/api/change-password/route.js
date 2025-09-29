import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import bcrypt from "bcryptjs";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { OTP_STORE } from "../send-otp/route";

export async function POST(req) {
  try {
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const { otp, newPassword } = await req.json();
    if (!otp || !newPassword) {
      return NextResponse.json({ message: "OTP and newPassword required" }, { status: 400 });
    }

    await dbConnect();
    const user = await CompanyUser.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const otpData = OTP_STORE.get(user.email);
    if (!otpData || otpData.otp !== otp || otpData.expires < Date.now()) {
      return NextResponse.json({ message: "Invalid or expired OTP" }, { status: 400 });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    OTP_STORE.delete(user.email);

    return NextResponse.json({ message: "Password changed successfully" });
  } catch (e) {
    console.error("Change password error:", e);
    return NextResponse.json({ message: e.message }, { status: 401 });
  }
}
