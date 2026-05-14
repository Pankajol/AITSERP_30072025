import mongoose from "mongoose";

const BackupSettingsSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, unique: true },
  enabled: { type: Boolean, default: false },
  storageProvider: { type: String, enum: ["local", "google_drive", "dropbox", "s3", "azure"], default: "local" },
  schedule: { type: String, default: "0 2 * * *" },
  retentionDays: { type: Number, default: 30 },
  localPath: { type: String, default: "./backups" },
  
  // Google Drive
  googleClientId: { type: String, default: "" },
  googleClientSecret: { type: String, default: "" },
  googleRefreshToken: { type: String, default: "" },
  googleFolderId: { type: String, default: "" },
  
  // AWS S3
  awsAccessKeyId: { type: String, default: "" },
  awsSecretAccessKey: { type: String, default: "" },
  awsRegion: { type: String, default: "ap-south-1" },
  awsBucket: { type: String, default: "" },
  
  // Dropbox
  dropboxAccessToken: { type: String, default: "" },
  
  // Azure
  azureConnectionString: { type: String, default: "" },
  azureContainerName: { type: String, default: "backups" },
  
  lastBackupAt: { type: Date },
  lastBackupStatus: { type: String, enum: ["success", "failed"], default: null },
  lastBackupError: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.models.BackupSettings || mongoose.model("BackupSettings", BackupSettingsSchema);