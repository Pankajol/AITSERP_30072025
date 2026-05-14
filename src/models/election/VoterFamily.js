// models/VoterFamily.js
import mongoose from 'mongoose';

const VoterFamilySchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  headName: String,
  headVoterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voter' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Voter' }],
  familyId: String,           // जैसे 'FAM001'
  address: String,
  booth: { type: mongoose.Schema.Types.ObjectId, ref: 'Booth' },
  combinedInfluence: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' }
}, { timestamps: true });

export default mongoose.models.VoterFamily || mongoose.model('VoterFamily', VoterFamilySchema);