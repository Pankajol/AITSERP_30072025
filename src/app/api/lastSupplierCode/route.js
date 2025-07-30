import { NextResponse } from "next/server";
import Supplier from '@/models/SupplierModels'; // Changed to Supplier model
import connectDB from "@/lib/db";

export async function GET() {
  try {
    await connectDB();

    // Find the supplier with the highest code
    const lastSupplier = await Supplier.findOne()
      .sort({ supplierCode: -1 }) // Changed field to supplierCode
      .limit(1);

    // Default to "SUPP-0000" if no suppliers exist
    const lastSupplierCode = lastSupplier?.supplierCode || "SUPP-0000"; // Changed variable names

    return NextResponse.json({ lastSupplierCode }); // Changed response property name
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch last supplier code" }, // Updated error message
      { status: 500 }
    );
  }
}