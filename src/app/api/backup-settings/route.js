import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import BackupSettings from "@/models/BackupSettings";
import { createBackupForCompany } from "@/lib/backupService";

export async function GET(req) {
  await connectDB();
  const user = verifyJWT(getTokenFromHeader(req));
  if (!user || (user.type !== "company" && !user.roles?.includes("Admin")))
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  
  let settings = await BackupSettings.findOne({ companyId: user.companyId });
  if (!settings) settings = await BackupSettings.create({ companyId: user.companyId });
  const { googleClientSecret, googleRefreshToken, awsSecretAccessKey, dropboxAccessToken, azureConnectionString, ...safe } = settings.toObject();
  return NextResponse.json({ success: true, data: safe });
}

export async function PUT(req) {
  await connectDB();
  const user = verifyJWT(getTokenFromHeader(req));
  if (!user || (user.type !== "company" && !user.roles?.includes("Admin")))
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  
  const body = await req.json();
  const { ...updateData } = body;
  await BackupSettings.findOneAndUpdate(
    { companyId: user.companyId },
    updateData,
    { upsert: true, new: true }
  );
  return NextResponse.json({ success: true, message: "Settings saved" });
}

export async function POST(req) { // manual backup trigger
  await connectDB();
  const user = verifyJWT(getTokenFromHeader(req));
  if (!user || (user.type !== "company" && !user.roles?.includes("Admin")))
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  
  try {
    const backup = await createBackupForCompany(user.companyId);
    return NextResponse.json({ success: true, data: backup });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}