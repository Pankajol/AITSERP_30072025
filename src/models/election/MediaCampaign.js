// models/MediaCampaign.js
import mongoose from 'mongoose';

const MediaCampaignSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  title: String,
  platform: { type: String, enum: ['Facebook', 'Twitter', 'Instagram', 'YouTube', 'WhatsApp', 'Newspaper', 'TV', 'Radio'] },
  startDate: Date,
  endDate: Date,
  budget: Number,
  spent: Number,
  handler: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' },
  content: [{
    type: { type: String, enum: ['Post', 'Video', 'Image', 'Ad'] },
    url: String,
    reach: Number,
    engagement: Number,
    clicks: Number
  }],
  status: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' }
}, { timestamps: true });

export default mongoose.models.MediaCampaign || mongoose.model('MediaCampaign', MediaCampaignSchema);