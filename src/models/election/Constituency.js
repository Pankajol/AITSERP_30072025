// models/Constituency.js
import mongoose from 'mongoose';

const ConstituencySchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['Parliamentary', 'Assembly', 'Ward'] },
  district: String,
  state: String,
  totalVoters: { type: Number, default: 0 },
  // भौगोलिक बाउंड्री (GeoJSON) – भविष्य के लिए
  boundary: {
    type: { type: String, enum: ['Polygon'], default: 'Polygon' },
    coordinates: { type: [[[Number]]], default: [] }  // [lng, lat]
  },
  booths: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booth' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' }
}, { timestamps: true });

// 2dsphere index for location queries (optional)
ConstituencySchema.index({ boundary: '2dsphere' });

export default mongoose.models.Constituency || mongoose.model('Constituency', ConstituencySchema);