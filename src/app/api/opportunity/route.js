// app/api/opportunity/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Opportunity from "@/models/Opportunity";
 // Create this DB connection file

export async function POST(req) {
  try {
    await dbConnect();
    const data = await req.json();

    const opportunity = new Opportunity(data);
    const saved = await opportunity.save();

    return new Response(JSON.stringify({ success: true, data: saved }), { status: 201 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}

export async function GET() {
  try {
    await dbConnect();
    const opportunities = await Opportunity.find();
    return new Response(JSON.stringify({ success: true, data: opportunities }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}
