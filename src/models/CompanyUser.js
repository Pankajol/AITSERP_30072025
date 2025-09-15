import mongoose from 'mongoose';

const CompanyUserSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true, // hashed
    },
    roles: {
      type: [String],
      enum: [
        'Admin',
        'Sales Manager',
        'Purchase Manager',
        'Inventory Manager',
        'Accounts Manager',
        'HR Manager',
        'Support Executive',
        'Production Head',
        'Project Manager',
        'Employee',
      ],
      default: ['Sales Manager'],
    },
  },
  { timestamps: true }
);

// Unique index per company+email
CompanyUserSchema.index({ companyId: 1, email: 1 }, { unique: true });

export default mongoose.models.CompanyUser ||
       mongoose.model('CompanyUser', CompanyUserSchema);
