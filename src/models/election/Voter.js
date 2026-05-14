// models/Voter.js
import mongoose from 'mongoose';

const VoterSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  firstName: { type: String, required: true },
  middleName: String,
  lastName: String,
  voterId: { type: String, unique: true, sparse: true },  // EPIC नंबर
  aadhaar: { type: String, sparse: true },                // optional
  phone: { type: String, index: true },
  altPhone: String,
  email: String,
  age: Number,
  dob: Date,
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  caste: String,
  religion: String,
  occupation: String,
  education: String,
  address: {
    line1: String,
    village: String,
    postOffice: String,
    pincode: String,
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: [Number]  // [lng, lat]
    }
  },
  booth: { type: mongoose.Schema.Types.ObjectId, ref: 'Booth', required: true },
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'VoterFamily' },  // परिवार (नीचे देखें)
  supportLevel: {
    type: String,
    enum: ['StrongSupporter', 'WeakSupporter', 'Neutral', 'Opposition', 'Undecided'],
    default: 'Undecided'
  },
  influenceRating: { type: Number, min: 1, max: 5 },   // कितना प्रभावशाली
  tags: [String],                                      // जैसे 'युवा', 'किसान'
  contactHistory: [{
    date: Date,
    type: { type: String, enum: ['Phone', 'Visit', 'Meeting', 'WhatsApp'] },
    summary: String,
    outcome: String,          // 'Positive', 'Negative', 'Neutral'
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' }
  }],
  surveys: [{
    survey: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey' },
    answers: Object,                              // { questionIndex: answer }
    surveyedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' },
    date: Date,
    location: { type: { type: String }, coordinates: [Number] }  // survey location
  }],
  membershipNumber: String,           // पार्टी सदस्यता नंबर
  isRegisteredVoter: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' }
}, { timestamps: true });

VoterSchema.index({ 'address.location': '2dsphere' });

export default mongoose.models.Voter || mongoose.model('Voter', VoterSchema);