// models/Survey.js
import mongoose from 'mongoose';

const SurveySchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  title: { type: String, required: true },
  description: String,
  constituency: { type: mongoose.Schema.Types.ObjectId, ref: 'Constituency' },
  questionGroups: [{                      // एक से अधिक सेक्शन
    sectionName: String,
    questions: [{
      questionText: String,
      type: { type: String, enum: ['SingleSelect', 'MultiSelect', 'Text', 'Rating', 'Boolean', 'Number', 'Date'] },
      options: [String],
      required: { type: Boolean, default: false },
      order: Number
    }]
  }],
  startDate: Date,
  endDate: Date,
  assignedWorkers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' }],
  targetResponses: Number,               // कितने रिस्पॉन्स चाहिए
  status: { type: String, enum: ['Draft', 'Active', 'Paused', 'Completed'], default: 'Draft' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' }
}, { timestamps: true });

export default mongoose.models.Survey || mongoose.model('Survey', SurveySchema);