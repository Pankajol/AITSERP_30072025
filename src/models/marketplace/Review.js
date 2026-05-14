// models/marketplace/Review.js
import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "SalesOrder", required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },        // 1–5 star
    comment: { type: String, trim: true },
    images: [{ type: String }],                                     // optional photos
    status: { type: String, enum: ["pending", "approved", "hidden"], default: "approved" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" }
  },
  { timestamps: true }
);

// Ensure one review per product per customer per order (optional)
ReviewSchema.index({ companyId: 1, customerId: 1, orderId: 1, productId: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model("Review", ReviewSchema);