// src/app/api/hr/employees/[id]/documents/route.js
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import Employee from "@/models/hr/Employee";

export async function PATCH(req, { params }) {
  await connectDB();

  const token = getTokenFromHeader(req);
  const user  = verifyJWT(token);

  if (!user)
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  if (!hasPermission(user, "employees", "update"))
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  try {
    const employee = await Employee.findOne({ _id: params.id, companyId: user.companyId });
    if (!employee)
      return NextResponse.json({ success: false, message: "Employee not found" }, { status: 404 });

    const formData = await req.formData();
    const file     = formData.get("idDocument");

    if (!file || typeof file === "string")
      return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });

    const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
    const MAX_SIZE      = 5 * 1024 * 1024;

    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ success: false, message: "Only JPG, PNG or PDF allowed" }, { status: 422 });

    if (file.size > MAX_SIZE)
      return NextResponse.json({ success: false, message: "File must be under 5 MB" }, { status: 422 });

    const bytes    = await file.arrayBuffer();
    const buffer   = Buffer.from(bytes);
    const ext      = file.name.split(".").pop();
    const filename = `id_document_${Date.now()}.${ext}`;
    const dir      = path.join(process.cwd(), "public", "uploads", "employees", params.id);
    const filepath = path.join(dir, filename);

    await mkdir(dir, { recursive: true });
    await writeFile(filepath, buffer);

    employee.idDocumentUrl = `/uploads/employees/${params.id}/${filename}`;
    await employee.save();

    return NextResponse.json({
      success: true,
      data:    { documentUrl: employee.idDocumentUrl },
      message: "Document uploaded successfully",
    });
  } catch (err) {
    console.error("PATCH /api/hr/employees/[id]/documents error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}