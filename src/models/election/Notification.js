// models/election/Notification.js
import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" }, // recipient
  type: { type: String, enum: ['survey_assigned', 'rally_update', 'expense_alert', 'general'] },
  title: String,
  message: String,
  data: mongoose.Schema.Types.Mixed, // extra info like surveyId
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);