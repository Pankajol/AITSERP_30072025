// models/Ward.js
import mongoose from 'mongoose';

const WardSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  wardNumber: { type: String, required: true },      // analogous to boothNumber
  name: String,
  constituency: { type: mongoose.Schema.Types.ObjectId, ref: 'Constituency', required: true },
  address: {
    line1: String,
    village: String,
    postOffice: String,
    pincode: String,
    location: {                     // GPS coordinates
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }  // [lng, lat]
    }
  },
  block: { type: mongoose.Schema.Types.ObjectId, ref: 'Block' },
  totalVoters: { type: Number, default: 0 },
  assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' },  // वार्ड एजेंट
  incharge: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' },       // प्रभारी
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' }
}, { timestamps: true });

WardSchema.index({ 'address.location': '2dsphere' });

export default mongoose.models.Ward || mongoose.model('Ward', WardSchema);