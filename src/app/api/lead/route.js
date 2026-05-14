import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Lead from "@/models/load"; 

export async function POST(req) {
  await dbConnect();

  try {
    // ✅ Get token
    const token = getTokenFromHeader(req);
    if (!token) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
    }

    // ✅ Decode token
    const decoded = verifyJWT(token);

    // ✅ Parse request body
    const body = await req.json();

    // ✅ Create lead with LeadOwner = logged-in user
    const lead = await Lead.create({
      ...body,
      leadOwner: decoded.id,      // logged-in user id
      companyId: decoded.companyId, // optional if you want to track which company it belongs to
    });

    return new Response(JSON.stringify(lead), { status: 201 });
  } catch (err) {
    console.error("Lead create error:", err);
    return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
  }
}


// GET /api/lead
export async function GET(req) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    const user = await verifyJWT(token);
    if (!user) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    await dbConnect();

    // Only fetch leads owned by logged-in user
    const leads = await Lead.find({ leadOwner: user.id });

    return NextResponse.json(leads, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/lead:", error);
    return NextResponse.json(
      { message: "Failed to fetch leads." },
      { status: 500 }
    );
  }
}
