// models/SurveyResponse.js
import mongoose from 'mongoose';

const SurveyResponseSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  survey: { type: mongoose.Schema.Types.ObjectId, ref: 'Survey', required: true },
  voter: { type: mongoose.Schema.Types.ObjectId, ref: 'Voter', required: true },
  answers: [{                              // structured answers
    questionIndex: Number,                // या questionId
    answer: mongoose.Schema.Types.Mixed
  }],
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' },
  submittedAt: { type: Date, default: Date.now },
  gpsLocation: { type: { type: String }, coordinates: [Number] },
  meta: Object                           // extra data
}, { timestamps: true });

SurveyResponseSchema.index({ survey: 1, voter: 1 }, { unique: true }); // एक वोटर एक सर्वे में एक बार

export default mongoose.models.SurveyResponse || mongoose.model('SurveyResponse', SurveyResponseSchema);