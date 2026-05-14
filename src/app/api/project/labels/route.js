import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Label from "@/models/project/LabelModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const labels = await Label.find({ company: decoded.company }).sort({ createdAt: -1 });
    return NextResponse.json(labels, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);
    const body = await req.json();

    const label = new Label({
      ...body,
      company: decoded.company,
    });
    await label.save();

    return NextResponse.json(label, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
