import mongoose from 'mongoose';

const OperatorMachineMappingSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Company',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'companyUser',
  },
  operator: {
    type: mongoose.Schema.ObjectId,
    ref: 'Operator',
    required: true,
  },
  machine: {
    type: mongoose.Schema.ObjectId,
    ref: 'Machine',
    required: true,
  },
}, { timestamps: true });

// Ensure a unique mapping between an operator and a machine
OperatorMachineMappingSchema.index({ operator: 1, machine: 1 }, { unique: true });

export default mongoose.models.OperatorMachineMapping || mongoose.model('OperatorMachineMapping', OperatorMachineMappingSchema);
