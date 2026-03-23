import mongoose from "mongoose";

const GateEntrySchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  // Yahan se 'unique: true' hata diya gaya hai
  entryNo: { type: String, required: true }, 
  
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
  purchaseOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder" }], 
  
  vehicleNo: { type: String, required: true, uppercase: true, trim: true },
  driverName: { type: String, trim: true },
  driverPhone: { type: String, trim: true },
  transporterName: { type: String, trim: true },
  
  challanNo: { type: String, trim: true },
  challanDate: { type: Date },
  invoiceNo: { type: String, trim: true },
  
  entryTime: { type: Date, default: Date.now },
  exitTime: { type: Date }, 
  purpose: { 
    type: String, 
    enum: ["Material Inward", "Material Outward"], 
    default: "Material Inward" 
  },
  remarks: { type: String, trim: true },
  status: { 
    type: String, 
    enum: ["In-Gate", "Out-Gate", "Rejected"], 
    default: "In-Gate" 
  },

}, { timestamps: true });

// --- CRITICAL FIX: Compound Index ---
// Iska matlab: entryNo unique hai, lekin sirf us specific companyId ke liye.
GateEntrySchema.index({ companyId: 1, entryNo: 1 }, { unique: true });
GateEntrySchema.index({ vehicleNo: 1 });

export default mongoose.models.GateEntry || mongoose.model("GateEntry", GateEntrySchema);