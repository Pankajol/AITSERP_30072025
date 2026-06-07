import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

async function getCompanyIdFromToken(req) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id || decoded.companyId;
  } catch {
    return null;
  }
}

export async function POST(req) {
  try {
    const companyId = await getCompanyIdFromToken(req);
    if (!companyId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: "Current password and new password are required" },
        { status: 400 }
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: "New password must be at least 8 characters" },
        { status: 400 }
      );
    }

    await dbConnect();
    const company = await Company.findById(companyId).select("+password");
    if (!company) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, company.password);
    if (!isMatch) {
      return NextResponse.json(
        { message: "Current password is incorrect" },
        { status: 401 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    company.password = hashedPassword;
    await company.save();

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("POST /api/company/change-password error:", error);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}