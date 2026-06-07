import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req) {
  try {
    const { order_id, payment_id, signature } = await req.json();
    const body = order_id + "|" + payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature === signature) {
      return NextResponse.json({ success: true, message: "Payment verified" });
    } else {
      return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 400 });
    }
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}