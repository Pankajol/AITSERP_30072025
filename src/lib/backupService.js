import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import { google } from "googleapis";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { BlobServiceClient } from "@azure/storage-blob";
import Backup from "@/models/Backup";
import BackupSettings from "@/models/BackupSettings";

// ─────────────────────────────────────────────────────────────
// Helper: detect company reference field for a collection
// ─────────────────────────────────────────────────────────────
async function getCompanyField(collection) {
  const sample = await collection.findOne({});
  if (!sample) return null;
  const possible = ["companyId", "company", "company_id", "companyObjectId", "companyID", "CompanyId"];
  for (const field of possible) {
    if (sample.hasOwnProperty(field)) return field;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Generate backup data for a company (auto‑detects field)
// ─────────────────────────────────────────────────────────────
export async function generateBackupData(companyId) {
  const db = mongoose.connection.db;
  const companyIdStr = companyId.toString();
  const companyIdObj = new mongoose.Types.ObjectId(companyIdStr);
  
  const collections = await db.listCollections().toArray();
  const backup = {};

  for (const collInfo of collections) {
    const collName = collInfo.name;
    if (collName.startsWith("system.")) continue;

    const collection = db.collection(collName);
    const companyField = await getCompanyField(collection);
    if (!companyField) {
      // No company reference – skip (global collection like 'companies', 'users')
      continue;
    }

    const query = {
      $or: [
        { [companyField]: companyIdStr },
        { [companyField]: companyIdObj }
      ]
    };
    const docs = await collection.find(query).toArray();
    if (docs.length) backup[collName] = docs;
  }
  return backup;
}

// ─────────────────────────────────────────────────────────────
// Storage clients (unchanged)
// ─────────────────────────────────────────────────────────────
async function getGoogleDriveClient(settings) {
  const oauth2Client = new google.auth.OAuth2(
    settings.googleClientId,
    settings.googleClientSecret,
    "http://localhost"
  );
  oauth2Client.setCredentials({ refresh_token: settings.googleRefreshToken });
  return google.drive({ version: "v3", auth: oauth2Client });
}

function getS3Client(settings) {
  return new S3Client({
    region: settings.awsRegion,
    credentials: { accessKeyId: settings.awsAccessKeyId, secretAccessKey: settings.awsSecretAccessKey },
  });
}

function getAzureClient(settings) {
  return BlobServiceClient.fromConnectionString(settings.azureConnectionString);
}

// ─────────────────────────────────────────────────────────────
// Upload functions (unchanged)
// ─────────────────────────────────────────────────────────────
async function saveToLocal(data, filename, companyId, settings) {
  const dir = settings.localPath || "./backups";
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  return { storageType: "local", storagePath: filePath };
}

async function saveToGoogleDrive(data, filename, companyId, settings) {
  const drive = await getGoogleDriveClient(settings);
  const buffer = Buffer.from(JSON.stringify(data, null, 2));
  const media = { mimeType: "application/json", body: buffer };
  const requestBody = { name: filename, parents: settings.googleFolderId ? [settings.googleFolderId] : [] };
  const response = await drive.files.create({ requestBody, media, fields: "id, webViewLink" });
  return { storageType: "google_drive", storagePath: response.data.webViewLink, fileId: response.data.id };
}

async function saveToS3(data, filename, companyId, settings) {
  const s3 = getS3Client(settings);
  const buffer = Buffer.from(JSON.stringify(data, null, 2));
  const key = `backups/${companyId}/${filename}`;
  await s3.send(new PutObjectCommand({ Bucket: settings.awsBucket, Key: key, Body: buffer, ContentType: "application/json" }));
  const storagePath = `https://${settings.awsBucket}.s3.${settings.awsRegion}.amazonaws.com/${key}`;
  return { storageType: "s3", storagePath };
}

async function saveToAzure(data, filename, companyId, settings) {
  const container = getAzureClient(settings).getContainerClient(settings.azureContainerName);
  await container.createIfNotExists();
  const blockBlob = container.getBlockBlobClient(`backups/${companyId}/${filename}`);
  const buffer = Buffer.from(JSON.stringify(data, null, 2));
  await blockBlob.uploadData(buffer);
  return { storageType: "azure", storagePath: blockBlob.url };
}

async function saveToDropbox(data, filename, companyId, settings) {
  const fetch = (await import("node-fetch")).default;
  const buffer = Buffer.from(JSON.stringify(data, null, 2));
  const res = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.dropboxAccessToken}`,
      "Dropbox-API-Arg": JSON.stringify({ path: `/backups/${companyId}/${filename}`, mode: "add" }),
      "Content-Type": "application/octet-stream",
    },
    body: buffer,
  });
  if (!res.ok) throw new Error(`Dropbox upload failed: ${await res.text()}`);
  const result = await res.json();
  return { storageType: "dropbox", storagePath: `https://www.dropbox.com/home/backups/${companyId}/${filename}` };
}

// ─────────────────────────────────────────────────────────────
// Main backup function for a single company
// ─────────────────────────────────────────────────────────────
export async function createBackupForCompany(companyId) {
  let settings = await BackupSettings.findOne({ companyId });
  if (!settings) {
    // Create default settings (enabled, local storage)
    settings = await BackupSettings.create({
      companyId,
      enabled: true,
      storageProvider: "local",
      schedule: "0 2 * * *",
      retentionDays: 30,
      localPath: "./backups"
    });
    console.log(`Created default backup settings for company ${companyId}`);
  }
  if (!settings.enabled) throw new Error("Backup is disabled for this company.");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup_${companyId}_${timestamp}.json`;
  const data = await generateBackupData(companyId);
  
  let result;
  switch (settings.storageProvider) {
    case "local": result = await saveToLocal(data, filename, companyId, settings); break;
    case "google_drive": result = await saveToGoogleDrive(data, filename, companyId, settings); break;
    case "s3": result = await saveToS3(data, filename, companyId, settings); break;
    case "azure": result = await saveToAzure(data, filename, companyId, settings); break;
    case "dropbox": result = await saveToDropbox(data, filename, companyId, settings); break;
    default: throw new Error(`Unsupported provider: ${settings.storageProvider}`);
  }
  
  const backup = await Backup.create({
    companyId,
    filename,
    fileSize: Buffer.byteLength(JSON.stringify(data)),
    storageType: result.storageType,
    storagePath: result.storagePath,
    fileId: result.fileId,
    expiresAt: new Date(Date.now() + settings.retentionDays * 86400000),
    status: "completed",
  });
  
  await BackupSettings.updateOne({ companyId }, { lastBackupAt: new Date(), lastBackupStatus: "success", lastBackupError: "" });
  return backup;
}

export async function deleteOldBackupsForCompany(companyId) {
  const settings = await BackupSettings.findOne({ companyId });
  if (!settings) return;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() - settings.retentionDays);
  const oldBackups = await Backup.find({ companyId, createdAt: { $lt: expiryDate } });
  for (const backup of oldBackups) {
    try {
      if (backup.storageType === "local") {
        await fs.unlink(backup.storagePath).catch(console.error);
      } else if (backup.storageType === "google_drive") {
        const drive = await getGoogleDriveClient(settings);
        await drive.files.delete({ fileId: backup.fileId }).catch(console.error);
      } else if (backup.storageType === "s3") {
        const s3 = getS3Client(settings);
        const key = backup.storagePath.split(`.s3.${settings.awsRegion}.amazonaws.com/`)[1];
        await s3.send(new DeleteObjectCommand({ Bucket: settings.awsBucket, Key: key }));
      }
      await backup.deleteOne();
    } catch (err) {
      console.error(`Failed to delete old backup ${backup._id}:`, err);
    }
  }
}