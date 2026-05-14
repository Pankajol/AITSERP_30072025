// models/Rally.js
import mongoose from 'mongoose';

const RallySchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['JanSabha', 'RoadShow', 'Meeting', 'CornerMeeting'], default: 'JanSabha' },
  date: Date,
  startTime: String,
  endTime: String,
  venue: String,
  address: String,
  constituency: { type: mongoose.Schema.Types.ObjectId, ref: 'Constituency' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number]
  },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' },
  expectedCrowd: Number,
  actualCrowd: Number,
  budget: Number,
  expenses: [{
    category: String,
    amount: Number,
    description: String,
    billImage: String,
    vendor: String
  }],
  status: { type: String, enum: ['Planned', 'Approved', 'Ongoing', 'Completed', 'Cancelled'] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' }
}, { timestamps: true });

export default mongoose.models.Rally || mongoose.model('Rally', RallySchema);