import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Label from "@/models/project/LabelModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const label = await Label.findOne({ _id: params.id, company: decoded.companyId });
    if (!label) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(label);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const body = await req.json();
    const updated = await Label.findOneAndUpdate(
      { _id: params.id, company: decoded.companyId },
      body,
      { new: true }
    );

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const deleted = await Label.findOneAndDelete({
      _id: params.id,
      company: decoded.companyId,
    });

    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
