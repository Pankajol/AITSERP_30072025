import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import formidable from "formidable";
import { Readable } from "stream";
import dbConnect from "@/lib/db";
import PurchaseInvoice from "@/models/InvoiceModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Supplier from "@/models/SupplierModels";
import itemModels from "@/models/ItemModels";
import warehouseModels from "@/models/warehouseModels";

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helpers
function requestToNodeStream(req) {
  return Readable.fromWeb(req.body);
}

async function parseForm(req) {
  const form = formidable({ multiples: true });
  const headers = {};
  req.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  return new Promise((resolve, reject) => {
    form.parse(Object.assign(requestToNodeStream(req), { headers, method: req.method }),
      (err, fields, files) => {
        if (err) return reject(err);
        const parsedFields = {};
        for (const key in fields) {
          parsedFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
        }
        const parsedFiles = {};
        for (const key in files) {
          parsedFiles[key] = Array.isArray(files[key]) ? files[key] : [files[key]];
        }
        resolve({ fields: parsedFields, files: parsedFiles });
      });
  });
}

async function uploadFiles(fileObjects) {
  const uploadedFiles = [];
  if (fileObjects && fileObjects.length > 0) {
    for (const file of fileObjects) {
      if (!file || !file.filepath) continue;
      const result = await cloudinary.uploader.upload(file.filepath, {
        folder: "purchase-invoices",
        resource_type: "auto",
      });
      uploadedFiles.push({
        fileName: file.originalFilename,
        fileUrl: result.secure_url,
        fileType: file.mimetype,
        uploadedAt: new Date(),
        publicId: result.public_id,
      });
    }
  }
  return uploadedFiles;
}




// ✅ GET - Fetch invoice by ID
export async function GET(req, { params }) {
  const { id } = params;
  try {
    await dbConnect();

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Invalid ID" }, { status: 400 });
    }

    const invoice = await PurchaseInvoice.findById(id)
      .populate("supplier")
      .populate({
        path: "items.item",
        model: "Item"
      })
      .populate({
        path: "items.warehouse",
        model: "Warehouse"
      });

    if (!invoice) {
      return NextResponse.json({ success: false, message: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: invoice }, { status: 200 });
  } catch (error) {
    console.error("GET invoice by ID error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ✅ PUT - Update invoice
export async function PUT(req, { params }) {
  const { id } = params;
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!mongoose.isValidObjectId(id)) {
      throw new Error("Invalid invoice ID format");
    }

    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized");
    const decoded = verifyJWT(token);

    const { fields, files } = await parseForm(req);
    const invoiceData = JSON.parse(fields.invoiceData);

    // Handle removed files
    if (invoiceData.removedFiles && Array.isArray(invoiceData.removedFiles)) {
      for (const file of invoiceData.removedFiles) {
        if (file && file.publicId) {
          try {
            await cloudinary.uploader.destroy(file.publicId);
          } catch (err) {
            console.warn(`Failed to delete file: ${file.publicId}`, err);
          }
        }
      }
    }

    // Upload new files
    const newUploadedFiles = await uploadFiles(files.newAttachments);

    // Merge retained + new attachments
    const retainedExistingAttachments = Array.isArray(invoiceData.attachments) ? invoiceData.attachments : [];
    invoiceData.attachments = [...retainedExistingAttachments, ...newUploadedFiles];

    // Clean up extra fields
    delete invoiceData.removedFiles;

    const updatedInvoice = await PurchaseInvoice.findByIdAndUpdate(id, invoiceData, {
      new: true,
      runValidators: true,
      session,
    });

    if (!updatedInvoice) throw new Error("Invoice not found");

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ success: true, message: "Invoice updated", data: updatedInvoice }, { status: 200 });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("PUT update invoice error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
