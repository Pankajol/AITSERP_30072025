import mongoose from "mongoose";

// चेकपॉइंट सब-डॉक्युमेंट (गेट, एंट्रेंस)
const checkpointSchema = new mongoose.Schema({
  name: { type: String, required: true },
  latitude: Number,
  longitude: Number,
  radius: { type: Number, default: 30 },
}, { _id: true });

const buildingSchema = new mongoose.Schema({
  societyId: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
  companyId: { type: String, required: true, index: true },   // String for multi‑tenancy
  name: { type: String, required: true },                     // e.g., "Tower A", "Block 2"
  code: { type: String },                                     // short code, optional
  floors: { type: Number, default: 1 },
  address: {
    line1: String,
    city: String,
    pincode: String,
  },
  checkpoints: [checkpointSchema],   // गेट / एंट्रेंस
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// एक ही सोसाइटी में एक ही नाम की बिल्डिंग दोबारा नहीं हो सकती
buildingSchema.index({ societyId: 1, name: 1 }, { unique: true });

export default mongoose.models.Building || mongoose.model("Building", buildingSchema);