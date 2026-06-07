// models/SocialMediaLead.js
import mongoose from 'mongoose';
const socialMediaLeadSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  platform: { type: String, enum: ['facebook', 'instagram', 'whatsapp', 'shopify', 'indiamart'] },
  rawData: Object,   // full webhook payload
  processed: { type: Boolean, default: false },
  leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  createdAt: { type: Date, default: Date.now }
});
export default mongoose.models.SocialMediaLead || mongoose.model('SocialMediaLead', socialMediaLeadSchema);