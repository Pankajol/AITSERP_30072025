import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Lead from "@/models/crm/load";
import { NextResponse } from "next/server";

// ✅ GET single Lead
export async function GET(req, { params }) {
  await dbConnect();
  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const decoded = verifyJWT(token);
  if (!decoded) return NextResponse.json({ message: "Invalid token" }, { status: 401 });

  // ✅ CORRECT: Await the params promise
  const { id } = await params;
  try {
    const lead = await Lead.findOne({ _id: id, companyId: decoded.companyId });
    if (!lead) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json(lead, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}

// ✅ UPDATE Lead
export async function PUT(req, { params }) {
  await dbConnect();
  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const decoded = verifyJWT(token);
  if (!decoded) return NextResponse.json({ message: "Invalid token" }, { status: 401 });

  // ✅ CORRECT: Await the params promise
  const { id } = await params;
  const body = await req.json();

  try {
    const lead = await Lead.findOne({ _id: id, companyId: decoded.companyId });
    if (!lead) return NextResponse.json({ message: "Lead not found" }, { status: 404 });

    Object.assign(lead, body);
    await lead.save();
    return NextResponse.json(lead, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Update failed" }, { status: 500 });
  }
}

// ✅ DELETE Lead
export async function DELETE(req, { params }) {
  await dbConnect();
  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const decoded = verifyJWT(token);
  if (!decoded) return NextResponse.json({ message: "Invalid token" }, { status: 401 });

  // ✅ CORRECT: Await the params promise
  const { id } = await params;

  try {
    const lead = await Lead.findOneAndDelete({ _id: id, companyId: decoded.companyId });
    if (!lead) return NextResponse.json({ message: "Lead not found" }, { status: 404 });
    return NextResponse.json({ message: "Deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Delete failed" }, { status: 500 });
  }
}