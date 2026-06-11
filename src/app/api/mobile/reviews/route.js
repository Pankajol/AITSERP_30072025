import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ProductReview from "@/models/marketplace/ProductReview";
import Customer from "@/models/CustomerModel";
import Item from "@/models/ItemModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

async function getMobileUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  const decoded = verifyJWT(token);
  if (!decoded) return null;
  return decoded;
}

export async function POST(req) {
  try {
    await dbConnect();
    const user = await getMobileUser(req);
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { productId, rating, title, comment, images } = await req.json();

    if (!productId || !rating || !comment) {
      return NextResponse.json(
        { message: "productId, rating, and comment are required" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ message: "Rating must be between 1 and 5" }, { status: 400 });
    }

    // Verify product exists
    const item = await Item.findById(productId).lean();
    if (!item) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    // Check for existing review by this user on this product
    const existing = await ProductReview.findOne({
      productId,
      customerId: user.id,
    });
    if (existing) {
      return NextResponse.json(
        { message: "You have already reviewed this product." },
        { status: 409 }
      );
    }

    // Get customer name
    const customer = await Customer.findById(user.id).lean();
    const userName = customer?.customerName || "Customer";

    const review = await ProductReview.create({
      companyId:  item.companyId,
      customerId: user.id,
      productId,
      rating,
      title:      title || "",
      comment,
      images:     images || [],
      userName,
      status:     "approved", // auto-approve for mobile users
    });

    return NextResponse.json(
      {
        message: "Review submitted successfully",
        review: {
          _id:       review._id,
          userId:    user.id,
          userName,
          productId: review.productId,
          rating:    review.rating,
          title:     review.title,
          comment:   review.comment,
          images:    review.images,
          createdAt: review.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[mobile/reviews POST]", err);
    // Duplicate key = already reviewed
    if (err.code === 11000) {
      return NextResponse.json(
        { message: "You have already reviewed this product." },
        { status: 409 }
      );
    }
    return NextResponse.json({ message: "Server error", error: err.message }, { status: 500 });
  }
}
