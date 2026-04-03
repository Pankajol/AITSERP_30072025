import Razorpay from "razorpay";
import { NextResponse } from "next/server";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

export async function POST(req) {
  try {
    const { amount } = await req.json();

    const order = await razorpay.orders.create({
      amount: amount * 100, // paisa
      currency: "INR",
      payment_capture: 1,
    });

    return NextResponse.json({ success: true, order });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message });
  }
}