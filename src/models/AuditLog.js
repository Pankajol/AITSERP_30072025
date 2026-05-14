import mongoose from "mongoose";

const AuditLogSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userName: { type: String },
  action: { type: String, enum: ["CREATE", "UPDATE", "DELETE", "VIEW", "EXPORT", "LOGIN"], required: true },
  entityType: { type: String, required: true }, // e.g., "SalesInvoice", "Customer", "AccountHead"
  entityId: { type: mongoose.Schema.Types.ObjectId },
  oldData: { type: mongoose.Schema.Types.Mixed },
  newData: { type: mongoose.Schema.Types.Mixed },
  changes: { type: String }, // human-readable summary
  ipAddress: { type: String },
  userAgent: { type: String },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

AuditLogSchema.index({ companyId: 1, timestamp: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });

export default mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);