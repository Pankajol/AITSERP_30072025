// app/api/lastCustomerCode/route.js
import { NextResponse } from "next/server";
import Customer from '@/models/CustomerModel';
import connectDB from "@/lib/db"; // Your MongoDB connection utility

export async function GET() {
  try {
    await connectDB();

    // Find the customer with the highest code
    const lastCustomer = await Customer.findOne()
      .sort({ customerCode: -1 })
      .limit(1);

    // Default to "CUST-0000" if no customers exist
    const lastCustomerCode = lastCustomer?.customerCode || "CUST-0000";

    return NextResponse.json({ lastCustomerCode });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch last customer code" },
      { status: 500 }
    );
  }
}