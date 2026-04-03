import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import mongoose from "mongoose";

// ======================
// ✅ GET COMPANY
// ======================
export async function GET(req, { params }) {
  try {
    await dbConnect();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid company ID" },
        { status: 400 }
      );
    }

    const company = await Company.findById(id).select("-password");

    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(company);

  } catch (error) {
    console.error("GET Company Error:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}

// ======================
// ✅ UPDATE COMPANY
// ======================
export async function PUT(req, { params }) {
  try {
    await dbConnect();

    const { id } = params;
    const body = await req.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid company ID" },
        { status: 400 }
      );
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      id,
      { $set: body },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    if (!updatedCompany) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Company updated successfully",
      company: updatedCompany,
    });

  } catch (error) {
    console.error("UPDATE Company Error:", error);

    // Handle duplicate email / gst
    if (error.code === 11000) {
      return NextResponse.json(
        { message: "Duplicate field value" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}

// ======================
// ✅ DELETE COMPANY
// ======================
export async function DELETE(req, { params }) {
  try {
    await dbConnect();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid company ID" },
        { status: 400 }
      );
    }

    const deletedCompany = await Company.findByIdAndDelete(id);

    if (!deletedCompany) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Company deleted successfully",
    });

  } catch (error) {
    console.error("DELETE Company Error:", error);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}