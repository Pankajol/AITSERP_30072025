// models/marketplace/ProductReview.js
// Used by the mobile app for product-level reviews.
// Decoupled from vendorId/orderId so any customer can review any product.
import mongoose from "mongoose";

const ProductReviewSchema = new mongoose.Schema(
  {
    companyId:  { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    productId:  { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    // Denormalised name so list queries don't need a populate
    userName:   { type: String, default: "Customer" },
    rating:     { type: Number, min: 1, max: 5, required: true },
    title:      { type: String, trim: true, maxlength: 120 },
    comment:    { type: String, trim: true, maxlength: 2000 },
    images:     [{ type: String }],
    status:     {
      type:    String,
      enum:    ["pending", "approved", "hidden"],
      default: "approved",
    },
  },
  { timestamps: true }
);

// One review per customer per product
ProductReviewSchema.index(
  { companyId: 1, customerId: 1, productId: 1 },
  { unique: true }
);

// Speed up listing reviews for a product
ProductReviewSchema.index({ productId: 1, status: 1, createdAt: -1 });

export default mongoose.models.ProductReview ||
  mongoose.model("ProductReview", ProductReviewSchema);
