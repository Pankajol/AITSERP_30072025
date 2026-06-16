import { NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";

export async function POST(req) {
  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  if (signature !== expected) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);
  await dbConnect();

  switch (event.event) {
    case "subscription.charged": {
      const subId = event.payload.subscription.entity.id;
      const company = await Company.findOne({ razorpaySubscriptionId: subId });
      if (company) {
        const now = new Date();
        let newEnd = new Date(company.currentPeriodEnd);
        if (company.planType === "monthly") newEnd.setMonth(newEnd.getMonth() + 1);
        else if (company.planType === "yearly") newEnd.setFullYear(newEnd.getFullYear() + 1);
        else newEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        company.currentPeriodStart = now;
        company.currentPeriodEnd = newEnd;
        company.subscriptionStatus = "active";
        company.cancelAtPeriodEnd = false;
        await company.save();
      }
      break;
    }
    case "subscription.cancelled": {
      const subId = event.payload.subscription.entity.id;
      await Company.findOneAndUpdate(
        { razorpaySubscriptionId: subId },
        { cancelAtPeriodEnd: true }
      );
      break;
    }
    case "subscription.expired": {
      const subId = event.payload.subscription.entity.id;
      await Company.findOneAndUpdate(
        { razorpaySubscriptionId: subId },
        { subscriptionStatus: "expired" }
      );
      break;
    }
  }

  return NextResponse.json({ received: true });
}