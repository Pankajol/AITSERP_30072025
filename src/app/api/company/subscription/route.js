import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import jwt from "jsonwebtoken";

export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const companyId = decoded.companyId || decoded.id;
    if (!companyId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await dbConnect();
    const company = await Company.findById(companyId).select(
      "plan planType subscriptionStatus trialEndsAt currentPeriodStart currentPeriodEnd cancelAtPeriodEnd razorpaySubscriptionId"
    );

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Auto‑expire if trial or period ended
    const now = new Date();
    let statusChanged = false;
    if (company.subscriptionStatus === "trialing" && company.trialEndsAt && now > company.trialEndsAt) {
      company.subscriptionStatus = "expired";
      statusChanged = true;
    }
    if (company.subscriptionStatus === "active" && company.currentPeriodEnd && now > company.currentPeriodEnd) {
      company.subscriptionStatus = "expired";
      statusChanged = true;
    }
    if (statusChanged) await company.save();

    return NextResponse.json({ success: true, data: company });
  } catch (err) {
    console.error("Subscription GET error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}