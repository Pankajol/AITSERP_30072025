import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import GateEntry from "@/models/GateEntry";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    // Verify Token
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);
    if (!decoded || !decoded.companyId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Update only if entry belongs to the user's company
    const updatedEntry = await GateEntry.findOneAndUpdate(
      { _id: id, companyId: decoded.companyId }, // Secure check
      { 
        status: body.status, 
        exitTime: body.exitTime || new Date(),
        remarks: body.remarks 
      },
      { new: true }
    ).populate("supplier purchaseOrders");

    if (!updatedEntry) {
      return NextResponse.json({ success: false, error: "Record not found or access denied" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedEntry });
  } catch (error) {
    console.error("Gate Entry Action Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const entry = await GateEntry.findOne({ _id: id, companyId: decoded.companyId })
      .populate("supplier purchaseOrders");
      
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}