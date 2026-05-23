// models/election/Voter.js
import mongoose from 'mongoose';

const VoterSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    constituencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Constituency" },
    firstName: { type: String, required: true },
    middleName: String,
    lastName: String,
    voterId: { type: String, unique: true, sparse: true },
    aadhaar: { type: String, sparse: true },
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
        pincode: String
        // ❌ location को हटा दिया गया है (अभी ज़रूरत नहीं)
        // अगर भविष्य में चाहिए तो coordinates के साथ ही डालें
    },
    booth: { type: mongoose.Schema.Types.ObjectId, ref: 'Booth', required: true },
    familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'VoterFamily' },
    supportLevel: {
        type: String,
        enum: ['StrongSupporter', 'WeakSupporter', 'Neutral', 'Opposition', 'Undecided'],
        default: 'Undecided'
    },
    influenceRating: { type: Number, min: 1, max: 5 },
    tags: [String],
    contactHistory: [{
        date: Date,
        type: { type: String, enum: ['Phone', 'Visit', 'Meeting', 'WhatsApp'] },
        summary: String,
        outcome: String,
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' }
    }],
    surveys: [{
        survey: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey' },
        answers: Object,
        surveyedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' },
        date: Date,
        location: { type: { type: String }, coordinates: [Number] }  // survey location (optional)
    }],
    membershipNumber: String,
    isRegisteredVoter: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' }
}, { timestamps: true });

// 🔧 2dsphere index हटाया जा चुका है; नीचे की लाइन को हमेशा के लिए हटा दें
// VoterSchema.index({ 'address.location': '2dsphere' });

export default mongoose.models.Voter || mongoose.model('Voter', VoterSchema);