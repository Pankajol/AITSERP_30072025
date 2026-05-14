// models/marketplace/Vendor.js
import mongoose from "mongoose";

const VendorSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    businessName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },               // hashed
    phone: { type: String, trim: true },
    category: [{ type: String }],                             // e.g., ["Entertainment", "Photography"]
    commissionPercent: { type: Number, default: 10 },          // admin override
    status: { type: String, enum: ["pending", "active", "suspended"], default: "pending" },
    address: {
      line1: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true }
    },
    bankDetails: {
      accountNumber: { type: String },
      ifsc: { type: String },
      beneficiaryName: { type: String }
    },
    documents: [{ type: String }],                             // uploaded file URLs
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" }   // admin who created
  },
  { timestamps: true }
);

export default mongoose.models.Vendor || mongoose.model("Vendor", VendorSchema);