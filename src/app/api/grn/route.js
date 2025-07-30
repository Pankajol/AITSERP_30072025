// File: src/app/api/grn/route.js
import Supplier from "@/models/SupplierModels";
import ItemModels from "@/models/ItemModels";
// File: src/app/api/grn/route.js

import { NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import formidable from "formidable";
import { Readable } from "stream";
import dbConnect from "@/lib/db";
import GRN from "@/models/grnModels"; // Assuming your GRN model
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth"; // Your auth helpers

export const dynamic = 'force-dynamic';

// ✅ Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * ✅ Convert Fetch API Request (App Router) body to Node.js Readable Stream
 * and attach headers/method for formidable.
 */
function createNodeCompatibleRequest(req) {
  const nodeReq = Readable.fromWeb(req.body);
  nodeReq.headers = Object.fromEntries(req.headers.entries());
  nodeReq.method = req.method;
  return nodeReq;
}

/**
 * ✅ Parse form-data for Next.js App Router
 */
async function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      multiples: true,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024,
    });
    
    const nodeReq = createNodeCompatibleRequest(req);

    form.parse(nodeReq, (err, fields, files) => {
      if (err) {
        console.error("Formidable parse error:", err);
        return reject(err);
      }
      
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

/**
 * ✅ Upload Files to Cloudinary and return structured array
 */
async function uploadFiles(fileObjects, folderName, companyId) {
  const uploadedFiles = [];
  const fileArray = Array.isArray(fileObjects) ? fileObjects : []; 

  if (fileArray.length > 0) {
    for (const file of fileArray) {
      if (!file || !file.filepath) {
        console.warn("Skipping invalid file object for upload (no filepath):", file);
        continue;
      }
      try {
        const result = await cloudinary.uploader.upload(file.filepath, {
          folder: `${folderName}/${companyId || 'default_company_attachments'}`,
          resource_type: "auto",
          original_filename: file.originalFilename,
        });
        uploadedFiles.push({
          fileName: file.originalFilename || result.original_filename,
          fileUrl: result.secure_url,
          fileType: file.mimetype || "application/octet-stream",
          uploadedAt: new Date(),
          publicId: result.public_id,
        });
      } catch (uploadError) {
        console.error(`Cloudinary upload error for ${file.originalFilename}:`, uploadError);
        throw new Error(`Failed to upload file ${file.originalFilename}: ${uploadError.message}`);
      }
    }
  }
  return uploadedFiles;
}

/**
 * ✅ Delete Files from Cloudinary by their public IDs
 */
async function deleteFilesByPublicIds(publicIds) {
  if (!publicIds || publicIds.length === 0) return;

  for (const publicId of publicIds) {
    try {
      await cloudinary.uploader.destroy(publicId);
      console.log(`Deleted Cloudinary asset: ${publicId}`);
    } catch (deleteError) {
      console.error(`Error deleting Cloudinary asset ${publicId}:`, deleteError);
    }
  }
}


/**
 * ✅ Helper to process each GRN line item for Inventory and Stock Movement updates
 * This function handles both overall quantity and batch-specific updates.
 */
async function processGrnItem(item, grnId, decodedToken, session) {
  const qty = Number(item.quantity);

  // ✅ Extract proper IDs
  const itemId = item.item?._id || item.item;
  const warehouseId = item.warehouse;

  if (!itemId || !Types.ObjectId.isValid(itemId) || !warehouseId || !Types.ObjectId.isValid(warehouseId) || qty <= 0) {
    console.warn(`Skipping invalid GRN item: ${item.itemCode || itemId} - missing item/warehouse ID or invalid quantity. Item data:`, item);
    throw new Error(`Invalid GRN item data for ${item.itemCode || 'an item'}. Check Item ID, Warehouse ID, or Quantity.`);
  }

  let inventoryDoc = await Inventory.findOne({
    item: new Types.ObjectId(itemId),
    warehouse: new Types.ObjectId(warehouseId),
    companyId: decodedToken.companyId
  }).session(session);

  if (!inventoryDoc) {
    inventoryDoc = await Inventory.create([{
      item: new Types.ObjectId(itemId),
      warehouse: new Types.ObjectId(warehouseId),
      companyId: decodedToken.companyId,
      quantity: 0,
      committed: 0,
      onOrder: 0,
      batches: [],
    }], { session });
    inventoryDoc = inventoryDoc[0];
    console.log(`Created new Inventory record for item ${itemId} in warehouse ${warehouseId}`);
  }

  // ✅ Reduce onOrder, increase actual quantity
  inventoryDoc.onOrder = Math.max((inventoryDoc.onOrder || 0) - qty, 0);

  /* ---------- Batch-Managed Items Handling ---------- */
  if (item.managedBy?.toLowerCase() === "batch" && Array.isArray(item.batches) && item.batches.length > 0) {
    for (const receivedBatch of item.batches) {
      const batchQty = Number(receivedBatch.allocatedQuantity ?? receivedBatch.batchQuantity);
      if (!receivedBatch.batchNumber || isNaN(batchQty) || batchQty <= 0) {
        console.warn(`Skipping invalid batch for ${item.itemCode}:`, receivedBatch);
        continue;
      }

      const batchIndex = inventoryDoc.batches.findIndex(b => b.batchNumber === receivedBatch.batchNumber);
      if (batchIndex === -1) {
        inventoryDoc.batches.push({
          batchNumber: receivedBatch.batchNumber,
          quantity: batchQty,
          expiryDate: receivedBatch.expiryDate ? new Date(receivedBatch.expiryDate) : null,
          manufacturer: receivedBatch.manufacturer || '',
          unitPrice: receivedBatch.unitPrice || 0,
        });
      } else {
        inventoryDoc.batches[batchIndex].quantity += batchQty;
      }
    }
  } else if (item.managedBy?.toLowerCase() === "batch" && (!Array.isArray(item.batches) || item.batches.length === 0)) {
    console.warn(`Item ${item.itemCode} is batch-managed but no batches provided. Proceeding with normal update.`);
    // ✅ Do nothing special
  }

  // ✅ Always update overall quantity
  inventoryDoc.quantity += qty;
  await inventoryDoc.save({ session });

  // ✅ Stock Movement
  await StockMovement.create([{
    item: new Types.ObjectId(itemId),
    warehouse: new Types.ObjectId(warehouseId),
    movementType: "IN",
    quantity: qty,
    reference: grnId,
    referenceType: "GRN",
    remarks: "Stock received via GRN",
    companyId: decodedToken.companyId,
    createdBy: decodedToken.userId,
  }], { session });

  console.log(`Processed GRN item: ${item.itemCode || itemId}, qty: ${qty}`);
}



/**
 * ✅ POST: Create a new GRN document and update inventory/stock movements.
 */
export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ success: false, error: "Unauthorized: No token provided" }, { status: 401 });
    }
    const decoded = verifyJWT(token);
    if (!decoded || !decoded.companyId) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ success: false, error: "Unauthorized: Invalid token payload" }, { status: 401 });
    }

    const { fields, files } = await parseForm(req);
    
    const grnData = JSON.parse(fields.grnData || "{}");
    const removedFilesPublicIds = JSON.parse(fields.removedFiles || "[]");
    const existingFilesMetadata = JSON.parse(fields.existingFiles || "[]");

    grnData.companyId = decoded.companyId;
    delete grnData._id;

    const newUploadedFiles = await uploadFiles(files.newAttachments || [], "grn-attachments", decoded.companyId);

    grnData.attachments = [
      ...(Array.isArray(existingFilesMetadata) ? existingFilesMetadata.filter(f => !removedFilesPublicIds.includes(f.publicId)) : []),
      ...newUploadedFiles,
    ];

    await deleteFilesByPublicIds(removedFilesPublicIds);

    if (!grnData || !Array.isArray(grnData.items) || grnData.items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ success: false, error: "Invalid GRN data: Missing items or invalid structure." }, { status: 400 });
    }

    const [grn] = await GRN.create([grnData], { session });
    console.log("GRN created with _id:", grn._id);

    for (const item of grnData.items) {
        await processGrnItem(item, grn._id, decoded, session);
    }

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ success: true, message: "GRN created successfully and inventory updated", data: grn }, { status: 201 });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("POST /api/grn error:", error.stack || error);
    const errorMessage = error.message || "Failed to process GRN due to an internal server error.";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
/**
 * ✅ PUT: Update GRN
 */
export async function PUT(req) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.companyId)
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

    const { fields, files } = await parseForm(req);
    const grnData = JSON.parse(fields.grnData || "{}");
    const removedFiles = JSON.parse(fields.removedFiles || "[]");
    const existingFiles = JSON.parse(fields.existingFiles || "[]");

    if (!grnData._id) return NextResponse.json({ success: false, error: "GRN ID required" }, { status: 400 });
    if (!Array.isArray(grnData.items) || grnData.items.length === 0)
      return NextResponse.json({ success: false, error: "At least one item required" }, { status: 400 });

    // ✅ Validate ObjectIds
    for (let i = 0; i < grnData.items.length; i++) {
      const item = grnData.items[i];
      if (!Types.ObjectId.isValid(item.item)) throw new Error(`Invalid item ID for row ${i + 1}`);
      if (!Types.ObjectId.isValid(item.warehouse)) throw new Error(`Invalid warehouse ID for row ${i + 1}`);
    }

    // ✅ Upload new files and merge
    const newFiles = await uploadFiles(files);
    grnData.attachments = [...existingFiles, ...newFiles];

    // ✅ Remove deleted files from Cloudinary
    for (const file of removedFiles) {
      if (file.publicId) await cloudinary.uploader.destroy(file.publicId);
    }

    const updatedGRN = await GRN.findByIdAndUpdate(grnData._id, grnData, { new: true, session });
    if (!updatedGRN) return NextResponse.json({ success: false, error: "GRN not found" }, { status: 404 });

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ success: true, message: "GRN updated successfully", data: updatedGRN }, { status: 200 });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("PUT /api/grn error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * ✅ GET: Fetch GRNs
 */
export async function GET(req) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.companyId)
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const companyId = decoded.companyId;

    if (id) {
      const grn = await GRN.findOne({ _id: id, companyId })
        .populate("supplier", "supplierCode supplierName")
        .populate("items.item", "itemCode itemName");
      if (!grn) return NextResponse.json({ success: false, error: "GRN not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: grn }, { status: 200 });
    }

    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const total = await GRN.countDocuments({ companyId });

    const grns = await GRN.find({ companyId })
      .populate("supplier", "supplierCode supplierName")
      .populate("items.item", "itemCode itemName")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({ success: true, data: grns, pagination: { page, limit, total } }, { status: 200 });
  } catch (error) {
    console.error("GET /api/grn error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * ✅ DELETE: Remove GRN
 */
export async function DELETE(req) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.companyId)
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "GRN ID required" }, { status: 400 });

    const grn = await GRN.findByIdAndDelete(id);
    if (!grn) return NextResponse.json({ success: false, error: "GRN not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "GRN deleted" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/grn error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}



