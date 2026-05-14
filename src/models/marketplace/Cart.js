// models/marketplace/Cart.js
import mongoose from "mongoose";

const CartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Item", required: true },   // आपका Item मॉडल
  variantId: { type: mongoose.Schema.Types.ObjectId },           // variant का _id (अगर चुना)
  quantity: { type: Number, required: true, default: 1 },
  selectedDate: { type: Date },                                  // सर्विस के लिए
  price: { type: Number, required: true }                        // यूनिट प्राइस
}, { _id: true });

const CartSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, unique: true }, // एक कस्टमर का एक ही कार्ट
    items: [CartItemSchema]
  },
  { timestamps: true }
);

export default mongoose.models.Cart || mongoose.model("Cart", CartSchema);