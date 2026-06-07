import mongoose from "mongoose";

const checkpointSchema = new mongoose.Schema({
  name: { type: String, required: true },
  latitude: Number,
  longitude: Number,
  radius: { type: Number, default: 50 },
}, { _id: true });

const societySchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  name: { type: String, required: true },
  code: { type: String },   // unique हटा दिया
  siteType: { type: String, enum: ["Society", "Office", "Apartment", "Mall", "Warehouse"] },
  address: {
    line1: String,
    city: String,
    state: String,
    pincode: String,
  },
  contactPerson: { name: String, phone: String, email: String },
  geofence: {
    latitude: Number,
    longitude: Number,
    radius: Number,
  },
  checkpoints: [checkpointSchema],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// कंपाउंड यूनिक इंडेक्स – हर कंपनी में कोड यूनिक, और नाम भी यूनिक (वैकल्पिक)
societySchema.index({ companyId: 1, code: 1 }, { unique: true });
societySchema.index({ companyId: 1, name: 1 }, { unique: true });

export default mongoose.models.Society || mongoose.model("Society", societySchema);