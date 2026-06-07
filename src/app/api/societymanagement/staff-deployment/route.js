import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Deployment from "@/models/society/Deployment";
import Employee from "@/models/hr/Employee";
import Society from "@/models/society/Society";
import Shift from "@/models/hr/Shift";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

async function getUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  const user = await verifyJWT(token);
  if (!user) return { error: "Invalid token", status: 401 };
  return { user };
}

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Deployment", "view")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const employeeId = searchParams.get("employeeId");
    const societyId = searchParams.get("societyId");
    const isActive = searchParams.get("isActive");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);

    // ✅ JWT से सीधे String (companyId हमेशा String है)
    const companyIdStr = user.companyId || user._id || user.id;

    // 🔥 Native MongoDB collection
    const db = mongoose.connection.db;
    const collection = db.collection("deployments");

    // क्वेरी ऑब्जेक्ट बनाओ
    let filter = { companyId: companyIdStr };

    // अतिरिक्त फ़िल्टर (ObjectId कास्टिंग ज़रूरी)
    if (employeeId) filter.employeeId = new mongoose.Types.ObjectId(employeeId);
    if (societyId) filter.societyId = new mongoose.Types.ObjectId(societyId);
    if (isActive !== undefined && isActive !== "") filter.isActive = isActive === "true";

    // सिंगल डॉक्युमेंट
    if (id) {
      const doc = await collection.findOne({ _id: new mongoose.Types.ObjectId(id), ...filter });
      if (!doc) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

      // मैन्युअल पॉप्युलेट (Employee, Society, Shift के नाम लाओ)
      if (doc.employeeId) doc.employeeId = await Employee.findById(doc.employeeId, "fullName employeeCode").lean();
      if (doc.societyId) doc.societyId = await Society.findById(doc.societyId, "name code").lean();
      if (doc.shiftId) doc.shiftId = await Shift.findById(doc.shiftId, "name").lean();
      return NextResponse.json({ success: true, data: doc });
    }

    // लिस्ट क्वेरी
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      collection.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).toArray(),
      collection.countDocuments(filter),
    ]);

    // हर डॉक्युमेंट में मैन्युअल पॉप्युलेट
    for (const d of docs) {
      if (d.employeeId) d.employeeId = await Employee.findById(d.employeeId, "fullName employeeCode").lean();
      if (d.societyId) d.societyId = await Society.findById(d.societyId, "name code").lean();
      if (d.shiftId) d.shiftId = await Shift.findById(d.shiftId, "name").lean();
    }

    return NextResponse.json({
      success: true,
      data: docs,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("GET /deployment error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}