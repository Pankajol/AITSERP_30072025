import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ProductReview from "@/models/marketplace/ProductReview";
import Customer from "@/models/CustomerModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const resolvedParams = await params;
    const productId = resolvedParams.productId;

    if (!productId) {
      return NextResponse.json({ message: "productId is required" }, { status: 400 });
    }

    const reviews = await ProductReview.find({
      productId,
      status: "approved",
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Populate customer names
    const customerIds = reviews.map((r) => r.customerId).filter(Boolean);
    const customers = await Customer.find({ _id: { $in: customerIds } })
      .select("customerName")
      .lean();
    const customerMap = customers.reduce((acc, c) => {
      acc[c._id.toString()] = c.customerName;
      return acc;
    }, {});

    const mapped = reviews.map((r) => ({
      _id:       r._id,
      userId:    r.customerId?.toString() || "unknown",
      userName:  customerMap[r.customerId?.toString()] || r.userName || "Customer",
      productId: r.productId?.toString(),
      rating:    r.rating,
      title:     r.title || "",
      comment:   r.comment || "",
      images:    r.images || [],
      createdAt: r.createdAt,
    }));

    return NextResponse.json({ reviews: mapped, total: mapped.length });
  } catch (err) {
    console.error("[mobile/products/:id/reviews GET]", err);
    return NextResponse.json({ message: "Server error", error: err.message }, { status: 500 });
  }
}
