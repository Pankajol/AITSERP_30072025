// models/ElectionExpense.js
import mongoose from 'mongoose';

const ElectionExpenseSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  party: { type: mongoose.Schema.Types.ObjectId, ref: 'ElectionParty', required: true },
  expenseDate: Date,
  category: {
    type: String,
    enum: ['Travel', 'Publicity', 'Printing', 'Meeting', 'Rally', 'Media', 'Miscellaneous'],
    required: true
  },
  description: String,
  amount: Number,
  vendor: String,
  billImage: String,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' },
  // ये फील्ड तब भरेंगे जब अकाउंटिंग एंट्री हो जाए
  journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'CompanyUser' }
}, { timestamps: true });

export default mongoose.models.ElectionExpense || mongoose.model('ElectionExpense', ElectionExpenseSchema);