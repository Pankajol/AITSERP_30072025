import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    await dbConnect();

    const { email, password } = await req.json();

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await Company.updateOne(
      { email: email.toLowerCase() },
      { $set: { password: hashedPassword } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}