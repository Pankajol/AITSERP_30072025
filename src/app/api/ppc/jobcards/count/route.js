// src/app/api/ppc/jobcards/count/route.js
import dbConnect from "@/lib/db";
import JobCard from "@/models/ppc/JobCardModel";
import { NextResponse } from "next/server";

export async function GET(req) {
  await dbConnect();

  try {
    // Get query parameters
    const { searchParams } = new URL(req.url);
    const productionOrderId = searchParams.get("productionOrderId");

    if (!productionOrderId) {
      return NextResponse.json(
        { success: false, error: "productionOrderId is required" },
        { status: 400 }
      );
    }

    // Count job cards
    const count = await JobCard.countDocuments({ productionOrder: productionOrderId });

    return NextResponse.json({ success: true, count });
  } catch (err) {
    console.error("Error in /jobcards/count:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
