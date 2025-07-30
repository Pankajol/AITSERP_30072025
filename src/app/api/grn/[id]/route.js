import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import formidable from "formidable";
import { Readable } from "stream";
import dbConnect from "@/lib/db";
import GRN from "@/models/grnModels";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export const config = { api: { bodyParser: false } };

// ✅ Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** ✅ Convert App Router request to Node.js stream */
function createNodeCompatibleRequest(req) {
  const nodeReq = Readable.fromWeb(req.body);
  nodeReq.headers = Object.fromEntries(req.headers);
  nodeReq.method = req.method;
  return nodeReq;
}

/** ✅ Parse form-data using formidable */
async function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: true });
    const nodeReq = createNodeCompatibleRequest(req);
    form.parse(nodeReq, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });
}

/** ✅ Upload files to Cloudinary */
async function uploadFiles(files) {
  const uploadedFiles = [];
  const fileArray = files.attachments
    ? Array.isArray(files.attachments)
      ? files.attachments
      : [files.attachments]
    : [];

  for (const file of fileArray) {
    const uploadRes = await cloudinary.uploader.upload(file.filepath, {
      folder: "grn-attachments",
    });

    uploadedFiles.push({
      fileName: file.originalFilename || uploadRes.original_filename,
      fileUrl: uploadRes.secure_url,
      fileType: file.mimetype || "application/octet-stream",
      uploadedAt: new Date(),
      publicId: uploadRes.public_id,
    });
  }
  return uploadedFiles;
}

/* ✅ PUT: Update GRN */
export async function PUT(req, { params }) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.companyId)
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

    const { id } = params;
    if (!mongoose.isValidObjectId(id))
      return NextResponse.json({ success: false, error: "Invalid GRN ID" }, { status: 400 });

    const { fields, files } = await parseForm(req);
    const { grnData, existingFiles = "[]", removedFiles = "[]" } = fields;

    if (!grnData)
      return NextResponse.json({ success: false, error: "Missing GRN data" }, { status: 400 });

    let jsonData;
    try {
      jsonData = JSON.parse(grnData);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON format" }, { status: 400 });
    }

    const removedFilesArr = JSON.parse(removedFiles);
    const existingFilesArr = JSON.parse(existingFiles);

    // ✅ Validate items
    if (!Array.isArray(jsonData.items) || jsonData.items.length === 0) {
      return NextResponse.json({ success: false, error: "At least one item required" }, { status: 400 });
    }

    // ✅ Upload new files
    const uploadedFiles = await uploadFiles(files);

    // ✅ Remove deleted files from Cloudinary
    for (const file of removedFilesArr) {
      if (file.publicId) await cloudinary.uploader.destroy(file.publicId);
    }

    // ✅ Merge attachments
    const finalAttachments = [
      ...existingFilesArr.filter((f) => !removedFilesArr.some((r) => r.publicId === f.publicId)),
      ...uploadedFiles,
    ];

    // ✅ Update GRN
    const updatedGRN = await GRN.findByIdAndUpdate(
      id,
      { ...jsonData, attachments: finalAttachments },
      { new: true, runValidators: true, session }
    );

    if (!updatedGRN) {
      await session.abortTransaction();
      return NextResponse.json({ success: false, error: "GRN not found" }, { status: 404 });
    }

    // ✅ Update Inventory & Stock Movement
    for (const item of updatedGRN.items) {
      if (item.warehouse && item.quantity) {
        await Inventory.updateOne(
          { item: item.item, warehouse: item.warehouse },
          { $inc: { quantity: item.receivedQuantity || item.quantity } },
          { upsert: true, session }
        );

        await StockMovement.findOneAndUpdate(
          {
            reference: updatedGRN._id,
            item: item.item,
            warehouse: item.warehouse,
          },
          {
            movementType: "IN",
            quantity: item.receivedQuantity || item.quantity,
            unitPrice: item.unitPrice,
            totalValue: item.totalAmount,
            remarks: `Updated via GRN ${updatedGRN.refNumber || updatedGRN._id}`,
          },
          { upsert: true, session }
        );
      }
    }

    await session.commitTransaction();
    return NextResponse.json({ success: true, data: updatedGRN, message: "GRN updated successfully" }, { status: 200 });
  } catch (error) {
    await session.abortTransaction();
    console.error("PUT /api/grn/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    session.endSession();
  }
}

/* ✅ GET: Fetch GRN Details */
export async function GET(req, { params }) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const user = verifyJWT(token);
    if (!user)
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

    const { id } = params;
    if (!id || !mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid GRN ID" }, { status: 400 });
    }

    const grn = await GRN.findById(id)
      .populate("supplier", "supplierName supplierCode")
      .populate("items.item", "itemName itemCode")
      .populate("items.warehouse", "warehouseName");

    if (!grn) {
      return NextResponse.json({ success: false, error: "GRN not found" }, { status: 404 });
    }

    // ✅ Normalize attachments
    const normalizedAttachments = (grn.attachments || []).map((file) => ({
      fileName: file.fileName || file.originalname || file.url?.split("/").pop() || "Document",
      fileUrl: file.fileUrl || file.url || "",
      fileType: file.fileType || "application/octet-stream",
      publicId: file.publicId || null,
      uploadedAt: file.uploadedAt || new Date(),
    }));

    return NextResponse.json({
      success: true,
      data: { ...grn.toObject(), attachments: normalizedAttachments },
    });
  } catch (error) {
    console.error("GET /api/grn/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
