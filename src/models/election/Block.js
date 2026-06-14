// models/election/Block.js
import mongoose from 'mongoose';

const BlockSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  blockNumber: { type: String, required: true },
  name: String,
  constituency: { type: mongoose.Schema.Types.ObjectId, ref: 'Constituency', required: true },
  address: {
    line1: String,
    village: String,
    postOffice: String,
    pincode: String,
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }
    }
  },
  totalVoters: { type: Number, default: 0 },
  assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' },
  incharge: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' }
}, { timestamps: true });

BlockSchema.index({ 'address.location': '2dsphere' });
BlockSchema.index({ constituency: 1, blockNumber: 1 }, { unique: true }); // unique block per constituency

export default mongoose.models.Block || mongoose.model('Block', BlockSchema);