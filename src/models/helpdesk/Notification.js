import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  type: {
  type: String,
  enum: ["SLA_BREACH", "NEGATIVE_SENTIMENT", "FEEDBACK", "ALERT"],
},
companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "CompanyUser" },
  type: String, // SLA_BREACH | NEGATIVE_SENTIMENT
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: "Ticket" },
  message: String,
  read: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
