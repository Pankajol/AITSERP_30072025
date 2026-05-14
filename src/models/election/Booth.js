// models/Booth.js
import mongoose from 'mongoose';

const BoothSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  boothNumber: { type: String, required: true },
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
  totalVoters: { type: Number, default: 0 },
  assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' },  // बूथ एजेंट
  incharge: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' },       // प्रभारी
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' }
}, { timestamps: true });

BoothSchema.index({ 'address.location': '2dsphere' });

export default mongoose.models.Booth || mongoose.model('Booth', BoothSchema);