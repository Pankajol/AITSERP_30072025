import Supplier from "@/models/SupplierModels";
import ItemModels from "@/models/ItemModels";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import dbConnect from "@/lib/db";
import PurchaseQuotation from "@/models/PurchaseQuotationModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = { api: { bodyParser: false } };

export async function POST(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

    const companyId = decoded.companyId;
    if (!mongoose.isValidObjectId(companyId)) {
      return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 401 });
    }

    const formData = await req.formData();
    const jsonData = JSON.parse(formData.get("data"));
    const files = formData.getAll("attachments");

    if (!jsonData.supplier || !mongoose.isValidObjectId(jsonData.supplier)) {
      return NextResponse.json({ success: false, error: "Valid supplier ID required" }, { status: 422 });
    }
    if (!Array.isArray(jsonData.items) || jsonData.items.length === 0) {
      return NextResponse.json({ success: false, error: "At least one item is required" }, { status: 422 });
    }

    // ✅ Upload files to Cloudinary
    const uploadedFiles = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const uploadRes = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "purchase-quotations", resource_type: "auto" },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(Buffer.from(buffer));
      });

      uploadedFiles.push({
        fileName: file.name,
        fileType: file.type,
        fileUrl: uploadRes.secure_url,
        cloudinaryId: uploadRes.public_id,
      });
    }

    const finalAttachments = [...(jsonData.existingFiles || []), ...uploadedFiles];

    // ✅ Save in DB
    const quotation = await PurchaseQuotation.create({
      ...jsonData,
      companyId,
      attachments: finalAttachments,
    });

    const populatedQuotation = await PurchaseQuotation.findById(quotation._id)
      .populate("supplier", "supplierCode supplierName contactPerson")
      .populate("items.item", "itemCode itemName unitPrice");

    return NextResponse.json(
      { success: true, data: populatedQuotation, message: "Purchase Quotation created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/purchase-quotation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


export async function GET(req) {
  try {
    await dbConnect();

    // ✅ Get token from request headers
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Verify JWT
    const decoded = verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    const companyId = decoded.companyId;
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 400 });
    }

    // ✅ Fetch quotations for the company
    const quotations = await PurchaseQuotation.find({ companyId })
      .populate("supplier", "supplierCode supplierName contactPerson")
      .populate("items.item", "itemCode itemName unitPrice")
      .sort({ createdAt: -1 }); // Latest first

    return NextResponse.json({ success: true, data: quotations }, { status: 200 });
  } catch (error) {
    console.error("GET /api/purchase-quotation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch purchase quotations" },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await dbConnect();

    // ✅ Auth Check
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

    const { id } = params; // ✅ Extract from dynamic route
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid quotation ID" }, { status: 400 });
    }

    // ✅ Parse FormData
    const formData = await req.formData();
    const jsonData = JSON.parse(formData.get("data"));
    const files = formData.getAll("attachments");

    // ✅ Handle file uploads
    const uploadedFiles = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const uploadRes = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({ folder: "purchase-quotations" }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }).end(Buffer.from(buffer));
      });

      uploadedFiles.push({
        fileName: file.name,
        fileType: file.type,
        fileUrl: uploadRes.secure_url,
        cloudinaryId: uploadRes.public_id,
      });
    }

    // ✅ Merge Attachments (existing + new)
    const existingFiles = jsonData.existingFiles || [];
    const removedFiles = jsonData.removedFiles || [];

    // ✅ Delete removed files from Cloudinary
    for (const file of removedFiles) {
      if (file.cloudinaryId) {
        await cloudinary.uploader.destroy(file.cloudinaryId);
      }
    }

    const finalAttachments = [
      ...existingFiles.filter((f) => !removedFiles.some((r) => r.cloudinaryId === f.cloudinaryId)),
      ...uploadedFiles,
    ];

    // ✅ Update Document
    const updatedQuotation = await PurchaseQuotation.findByIdAndUpdate(
      id,
      { ...jsonData, attachments: finalAttachments },
      { new: true, runValidators: true, session }
    )
      .populate("supplier", "supplierCode supplierName contactPerson")
      .populate("items.item", "itemCode itemName unitPrice");

    if (!updatedQuotation) {
      await session.abortTransaction();
      return NextResponse.json({ success: false, error: "Quotation not found" }, { status: 404 });
    }

    await session.commitTransaction();
    return NextResponse.json({ success: true, message: "Quotation updated", data: updatedQuotation }, { status: 200 });
  } catch (error) {
    await session.abortTransaction();
    console.error("PUT /api/purchase-quotation/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    session.endSession();
  }
}