// app/api/checkCustomerCode/route.js
import { NextResponse } from "next/server";
import Customer from '@/models/CustomerModel';
import connectDB from "@/lib/db";

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Missing code parameter" },
        { status: 400 }
      );
    }

    const existingCustomer = await Customer.findOne({ customerCode: code });
    return NextResponse.json({ exists: !!existingCustomer });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check customer code" },
      { status: 500 }
    );
  }
}