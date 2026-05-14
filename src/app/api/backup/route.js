import { NextResponse } from "next/server";
import mongoose from "mongoose"; // ✅ added missing import
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { createBackupForCompany, deleteOldBackupsForCompany } from "@/lib/backupService"; // ✅ correct function names
import Backup from "@/models/Backup";
import connectDB from "@/lib/db";

export async function GET(req) {
  await connectDB();
  const user = verifyJWT(getTokenFromHeader(req));
  if (!user || (user.type !== "company" && !user.roles?.includes("Admin"))) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const backupId = searchParams.get("id");
  
  // List backups
  if (!action) {
    const backups = await Backup.find({ companyId: user.companyId }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: backups });
  }
  
  // Download backup
  if (action === "download" && backupId) {
    const backup = await Backup.findOne({ _id: backupId, companyId: user.companyId });
    if (!backup) return NextResponse.json({ success: false, message: "Backup not found" }, { status: 404 });
    if (backup.storageType === "local") {
      const fs = await import("fs/promises");
      const data = await fs.readFile(backup.storagePath, "utf8");
      return new Response(data, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${backup.filename}"` } });
    } else if (backup.storageType === "google_drive") {
      const { google } = await import("googleapis");
      const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
      oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
      const drive = google.drive({ version: "v3", auth: oauth2Client });
      const response = await drive.files.get({ fileId: backup.fileId, alt: "media" }, { responseType: "stream" });
      const chunks = [];
      for await (const chunk of response.data) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      return new Response(buffer, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${backup.filename}"` } });
    } else {
      const res = await fetch(backup.storagePath);
      const data = await res.text();
      return new Response(data, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${backup.filename}"` } });
    }
  }
  
  return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
}

export async function POST(req) {
  await connectDB();
  const user = verifyJWT(getTokenFromHeader(req));
  if (!user || (user.type !== "company" && !user.roles?.includes("Admin"))) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const { action, backupId } = await req.json();
  
  // Manual backup
  if (action === "manual") {
    try {
      const backup = await createBackupForCompany(user.companyId); // ✅ correct function name
      return NextResponse.json({ success: true, data: backup });
    } catch (err) {
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
  }
  
  // Restore from backup
  if (action === "restore" && backupId) {
    const backup = await Backup.findOne({ _id: backupId, companyId: user.companyId });
    if (!backup) return NextResponse.json({ success: false, message: "Backup not found" }, { status: 404 });
    let backupData;
    if (backup.storageType === "local") {
      const fs = await import("fs/promises");
      const content = await fs.readFile(backup.storagePath, "utf8");
      backupData = JSON.parse(content);
    } else if (backup.storageType === "google_drive") {
      const { google } = await import("googleapis");
      const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
      oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
      const drive = google.drive({ version: "v3", auth: oauth2Client });
      const res = await drive.files.get({ fileId: backup.fileId, alt: "media" }, { responseType: "stream" });
      const chunks = [];
      for await (const chunk of res.data) chunks.push(chunk);
      backupData = JSON.parse(Buffer.concat(chunks).toString());
    } else {
      const res = await fetch(backup.storagePath);
      backupData = await res.json();
    }
    // Restore to database (company-specific)
    for (const [collection, docs] of Object.entries(backupData)) {
      for (const doc of docs) {
        await mongoose.connection.db.collection(collection).updateOne(
          { _id: doc._id, companyId: user.companyId },
          { $set: { ...doc, companyId: user.companyId } },
          { upsert: true }
        );
      }
    }
    return NextResponse.json({ success: true, message: "Restore completed" });
  }
  
  // Delete backup
  if (action === "delete" && backupId) {
    const backup = await Backup.findOne({ _id: backupId, companyId: user.companyId });
    if (!backup) return NextResponse.json({ success: false, message: "Backup not found" }, { status: 404 });
    if (backup.storageType === "local") {
      const fs = await import("fs/promises");
      await fs.unlink(backup.storagePath).catch(console.error);
    } else if (backup.storageType === "google_drive") {
      const { google } = await import("googleapis");
      const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
      oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
      const drive = google.drive({ version: "v3", auth: oauth2Client });
      await drive.files.delete({ fileId: backup.fileId }).catch(console.error);
    }
    await backup.deleteOne();
    return NextResponse.json({ success: true, message: "Backup deleted" });
  }
  
  return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
}