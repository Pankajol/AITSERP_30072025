// models/ElectionParty.js
import mongoose from 'mongoose';

const ElectionPartySchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  name: { type: String, required: true },             // पार्टी का नाम
  acronym: { type: String, uppercase: true },         // BJP, INC
  symbol: String,                                    // इमेज URL
  leader: String,                                    // राष्ट्रीय अध्यक्ष
  candidateName: { type: String, required: true },    // उम्मीदवार
  candidateImage: String,
  electionType: {
    type: String,
    enum: ['LokSabha', 'VidhanSabha', 'LocalBody'],
    required: true
  },
  constituency: { type: mongoose.Schema.Types.ObjectId, ref: 'Constituency' },
  campaignSlogan: String,
  manifestFile: String,                              // घोषणा पत्र PDF
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser', required: true }
}, { timestamps: true });

export default mongoose.models.ElectionParty || mongoose.model('ElectionParty', ElectionPartySchema);