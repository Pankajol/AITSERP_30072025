import dbConnect from "@/lib/db";
import Operator from "@/models/ppc/operatorModel";
import { NextResponse } from "next/server";

// ✅ GET single operator
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const operator = await Operator.findById(params.id);
    if (!operator)
      return NextResponse.json({ success: false, message: "Operator not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: operator }, { status: 200 });
  } catch (err) {
    console.error("Error fetching operator:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ✅ PUT update operator
export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const body = await req.json();

    const updated = await Operator.findByIdAndUpdate(params.id, body, { new: true });
    if (!updated)
      return NextResponse.json({ success: false, message: "Operator not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: updated, message: "Updated successfully!" });
  } catch (err) {
    console.error("Error updating operator:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ✅ DELETE operator
export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const deleted = await Operator.findByIdAndDelete(params.id);
    if (!deleted)
      return NextResponse.json({ success: false, message: "Operator not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Deleted successfully!" });
  } catch (err) {
    console.error("Error deleting operator:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
