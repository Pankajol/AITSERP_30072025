import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    contactName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      match: /^[0-9]{10}$/,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    gstNumber: {
      type: String,
      unique: true,
      sparse: true, // optional field, but still enforce uniqueness if present
      uppercase: true,
      trim: true,
      match: /^[0-9A-Z]{15}$/,
    },
    country: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    pinCode: {
      type: String,
      required: true,
      match: /^[0-9]{6}$/,
    },
    password: {
      type: String,
      required: true,
    },
    agreeToTerms: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Prevent model overwrite issue in development
export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
