import mongoose from "mongoose";

const residentSchema = new mongoose.Schema({
  societyId: { type: mongoose.Schema.Types.ObjectId, ref: "Society", required: true },
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: "Building", required: true },
  flatIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Flat", required: true }], // multiple flats
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },

  name: { type: String, required: true, trim: true },
  phone: { type: String, match: /^[0-9]{10}$/ },
  email: { type: String, lowercase: true, trim: true },
  residentType: { type: String, enum: ["Owner", "Tenant"], default: "Owner" },
  moveInDate: Date,
  moveOutDate: Date,
  isActive: { type: Boolean, default: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
}, { timestamps: true });

// Indexes
residentSchema.index({ societyId: 1, phone: 1 }); // no unique – same phone allowed for multiple flats
residentSchema.index({ flatIds: 1 });
residentSchema.index({ buildingId: 1 });

export default mongoose.models.Resident || mongoose.model("Resident", residentSchema);