import mongoose from 'mongoose';

const ResourceSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Company',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'companyUser',
  },
  code: {
    type: String,
    required: [true, 'Please provide a resource code'],
    unique: true,
    trim: true,
     index: true, 
  },
  name: {
    type: String,
    required: [true, 'Please provide a resource name'],
    trim: true,
  },
  unitPrice: {
    type: Number,
    required: [true, 'Please provide the resource cost'],
  },
}, { timestamps: true });

export default mongoose.models.Resource || mongoose.model('Resource', ResourceSchema);
