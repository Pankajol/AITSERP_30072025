import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const pincode = searchParams.get("pincode");

    if (!pincode) {
      return NextResponse.json({
        estimatedDays: 0,
        deliveryDate: "",
        shippingFee: 0,
        isDeliverable: false,
        message: "Pincode is required.",
      }, { status: 400 });
    }

    const pinPattern = /^[1-9][0-9]{5}$/;
    if (!pinPattern.test(pincode)) {
      return NextResponse.json({
        estimatedDays: 0,
        deliveryDate: "",
        shippingFee: 0,
        isDeliverable: false,
        message: "Invalid Pincode. Please enter a valid 6-digit Indian pincode.",
      });
    }

    const prefix = pincode.substring(0, 2);
    let estimatedDays = 4;
    let shippingFee = 99;

    // Region specific calculation rules
    if (["11", "40", "56", "60", "70"].includes(prefix)) {
      estimatedDays = 2; // Metro cities (Delhi, Mumbai, Bangalore, Chennai, Kolkata)
      shippingFee = 49;
    } else if (parseInt(prefix, 10) > 80) {
      estimatedDays = 7; // Remote areas / North East / J&K
      shippingFee = 149;
    }

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + estimatedDays);

    const formattedDate = deliveryDate.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    return NextResponse.json({
      estimatedDays,
      deliveryDate: formattedDate,
      shippingFee,
      isDeliverable: true,
      message: `Delivery by ${formattedDate} | Shipping Fee: ₹${shippingFee}`,
    });
  } catch (error) {
    console.error("Delivery Estimate API Error:", error);
    return NextResponse.json({ success: false, message: "Server error", error: error.message }, { status: 500 });
  }
}
