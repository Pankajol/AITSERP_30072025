// models/Tag.js
import mongoose from 'mongoose';
const tagSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true },
  color: String,
  module: { type: String, enum: ['lead', 'opportunity', 'customer'] }
});
export default mongoose.models.Tag || mongoose.model('Tag', tagSchema);