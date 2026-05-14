import mongoose from 'mongoose';
const { Schema } = mongoose;

const CountrySchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  name: {
    type: String,
    required: true,
   
    trim: true,
  },
  code: {
    type: String,
    required: true,
   
    trim: true,
    uppercase: true,
  },
   createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
}, { timestamps: true });

export default mongoose.models.Country || mongoose.model('Country', CountrySchema);
