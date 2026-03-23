import mongoose from "mongoose";

const GateEntrySchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  entryNo: { type: String, required: true, unique: true }, // Auto-generated (e.g., GE-2026-001)
  
  // --- Linkages ---
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
  
  // Yahan Array use kiya hai taaki Multiple POs store ho sakein
  purchaseOrders: [{ type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder" }], 
  
  // --- Logistics Details ---
  vehicleNo: { type: String, required: true, uppercase: true, trim: true },
  driverName: { type: String, trim: true },
  driverPhone: { type: String, trim: true },
  transporterName: { type: String, trim: true },
  
  // --- Document Details ---
  challanNo: { type: String, trim: true },
  challanDate: { type: Date },
  invoiceNo: { type: String, trim: true },
  
  // --- Security & Timing ---
  entryTime: { type: Date, default: Date.now },
  exitTime: { type: Date }, // Out-Gate karte waqt set hoga
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

// Indexing for faster searches

GateEntrySchema.index({ vehicleNo: 1 });

export default mongoose.models.GateEntry || mongoose.model("GateEntry", GateEntrySchema);