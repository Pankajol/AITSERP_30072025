import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Lead from "@/models/load";

// POST /api/lead
export async function POST(req) {
  try {
    const data = await req.json();
    await dbConnect();

    const newLead = new Lead(data);
    await newLead.save();

    return NextResponse.json({ message: "Lead created successfully." }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/lead:", error);
    return NextResponse.json({ message: "Failed to create lead." }, { status: 500 });
  }
}

export async function GET() {
  await dbConnect();
  const leads = await Lead.find();
  return NextResponse.json(leads);
}
