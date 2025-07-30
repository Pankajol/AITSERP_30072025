import Customer from "@/models/CustomerModel";
import ItemModels from "@/models/ItemModels";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import SalesQuotation from "@/models/SalesQuotationModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

// ✅ Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Disable Next.js body parser for FormData
export const config = { api: { bodyParser: false } };

// ✅ GET: Fetch single SQ by ID
export async function GET(req, { params }) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

    const { id } = await params; // ✅ Correct usage of params
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const quotation = await SalesQuotation.findById(id)
      .populate("customer", "customerCode customerName contactPerson")
      .populate("items.item", "itemCode itemName unitPrice");

    if (!quotation) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: quotation }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ✅ PUT: Update SQ (with attachments)
export async function PUT(req, { params }) {
  await dbConnect();

  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const decoded = verifyJWT(token);
  if (!decoded) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

  const { id } = params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
  }

  const contentType = req.headers.get("content-type") || "";
  let jsonData = {};
  let finalAttachments = [];

  try {
    if (contentType.includes("multipart/form-data")) {
      // ✅ Parse FormData for full update
      const formData = await req.formData();
      jsonData = JSON.parse(formData.get("quotationData"));
      const files = formData.getAll("attachments");

      // ✅ Upload files
      const uploadedFiles = [];
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const uploadRes = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream({ folder: "sales-quotations" }, (error, result) => {
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

      const existingFiles = jsonData.existingFiles || [];
      const removedFiles = jsonData.removedFiles || [];

      // ✅ Delete removed files
      for (const file of removedFiles) {
        if (file.cloudinaryId) {
          await cloudinary.uploader.destroy(file.cloudinaryId);
        }
      }

      finalAttachments = [
        ...existingFiles.filter((f) => !removedFiles.some((r) => r.cloudinaryId === f.cloudinaryId)),
        ...uploadedFiles,
      ];
    } else {
      // ✅ JSON Update (status change or simple fields)
      jsonData = await req.json();
    }

    const updateData = { ...jsonData };
    if (finalAttachments.length > 0) updateData.attachments = finalAttachments;

    // ✅ Check if this is a simple status update
    const isSimpleUpdate = Object.keys(updateData).length === 1 && updateData.status;

    let updatedQuotation;

    if (isSimpleUpdate) {
      // ✅ No transaction for simple status update
      updatedQuotation = await SalesQuotation.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: false, // avoid schema errors
      });
    } else {
      // ✅ Full update (attachments, etc.)
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        updatedQuotation = await SalesQuotation.findByIdAndUpdate(id, updateData, {
          new: true,
          runValidators: true,
          session,
        });
        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    }

    if (!updatedQuotation) {
      return NextResponse.json({ success: false, error: "Quotation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Quotation updated", data: updatedQuotation }, { status: 200 });

  } catch (error) {
    console.error("PUT /api/sales-quotation/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


// ✅ DELETE: Remove SQ
export async function DELETE(req, { params }) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const quotation = await SalesQuotation.findById(id);

    // ✅ Delete associated files from Cloudinary
    if (quotation && quotation.attachments && quotation.attachments.length > 0) {
      for (const file of quotation.attachments) {
        if (file.cloudinaryId) {
          try {
            await cloudinary.uploader.destroy(file.cloudinaryId);
          } catch (error) {
            console.error("Cloudinary Delete Error:", error);
          }
        }
      }
    }

    await SalesQuotation.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Deleted successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}