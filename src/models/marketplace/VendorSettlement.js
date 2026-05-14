// models/marketplace/VendorSettlement.js
import mongoose from "mongoose";

const VendorSettlementSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "SalesOrder", required: true },  // आपका SalesOrder
    orderItemIndex: { type: Number },                                        // ऑर्डर में कौन-सा आइटम
    amount: { type: Number, required: true },                                // कुल आइटम राशि
    commissionPercent: { type: Number, default: 0 },
    commissionAmount: { type: Number, default: 0 },
    netPayable: { type: Number, required: true },                            // amount - commission
    status: { type: String, enum: ["pending", "paid"], default: "pending" },
    paidAt: { type: Date },
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: "JournalEntry" }  // अकाउंटिंग लिंक
  },
  { timestamps: true }
);

export default mongoose.models.VendorSettlement || mongoose.model("VendorSettlement", VendorSettlementSchema);