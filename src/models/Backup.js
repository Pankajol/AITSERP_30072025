import mongoose from "mongoose";

const BackupSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
  filename: { type: String, required: true },
  fileSize: { type: Number, default: 0 },
  storageType: { type: String, enum: ["local", "google_drive", "dropbox", "onedrive", "s3"], required: true },
  storagePath: { type: String },
  fileId: { type: String },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  status: { type: String, enum: ["pending", "completed", "failed"], default: "completed" },
  error: { type: String },
}, { timestamps: true });

BackupSchema.index({ companyId: 1, createdAt: -1 });
BackupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Backup || mongoose.model("Backup", BackupSchema);