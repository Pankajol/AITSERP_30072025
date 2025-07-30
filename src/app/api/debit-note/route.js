import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import formidable from "formidable";
import { Readable } from "stream";
import dbConnect from "@/lib/db";
import DebitNote from "@/models/DebitNoteModel";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const { Types } = mongoose;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper to convert web Request body to Node.js stream for formidable
function requestToNodeStream(req) {
  if (!req.body) {
    throw new Error("Request body is undefined. Cannot convert to stream.");
  }
  return Readable.fromWeb(req.body);
}

// Parse form-data
async function parseForm(req) {
  const form = formidable({ multiples: true });
  const headers = {};
  for (const [key, value] of req.headers.entries()) {
    headers[key.toLowerCase()] = value;
  }
  return new Promise((resolve, reject) => {
    const nodeReq = Object.assign(requestToNodeStream(req), {
      headers,
      method: req.method,
    });
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

// Upload files to Cloudinary
async function uploadFiles(fileObjects, folderName, companyId) {
  const uploadedFiles = [];
  if (!fileObjects || fileObjects.length === 0) {
    return uploadedFiles;
  }
  for (const file of fileObjects) {
    if (!file || !file.filepath) {
      console.warn("Skipping invalid file object:", file);
      continue;
    }
    try {
      const result = await cloudinary.uploader.upload(file.filepath, {
        folder: `${folderName}/${companyId || 'default_company_attachments'}`,
        resource_type: "auto",
        original_filename: file.originalFilename,
      });
      uploadedFiles.push({
        fileName: file.originalFilename,
        fileUrl: result.secure_url,
        fileType: file.mimetype,
        uploadedAt: new Date(),
        publicId: result.public_id,
      });
    } catch (uploadError) {
      console.error(`Cloudinary upload error for ${file.originalFilename}:`, uploadError);
      throw new Error(`Failed to upload file ${file.originalFilename}: ${uploadError.message}`);
    }
  }
  return uploadedFiles;
}

// Delete files from Cloudinary
async function deleteFilesByPublicIds(publicIds) {
  if (!publicIds || publicIds.length === 0) return;
  const results = await Promise.allSettled(
    publicIds.map(async (publicId) => {
      try {
        await cloudinary.uploader.destroy(publicId);
        console.log(`Deleted Cloudinary asset: ${publicId}`);
        return { publicId, status: "fulfilled" };
      } catch (deleteError) {
        console.error(`Error deleting Cloudinary asset ${publicId}:`, deleteError);
        return { publicId, status: "rejected", error: deleteError.message };
      }
    })
  );
  results.filter(r => r.status === 'rejected').forEach(r => {
    console.error(`Failed to delete Cloudinary asset ${r.value.publicId}: ${r.value.error}`);
  });
}

export const dynamic = 'force-dynamic';

export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      console.error("Authentication Error: No token provided in request headers.");
      throw new Error("Unauthorized: No token provided.");
    }
    const decoded = verifyJWT(token);
    if (!decoded) {
      console.error("Authentication Error: JWT verification failed. Token might be expired, malformed, or signed with a different secret.");
      throw new Error("Unauthorized: Invalid token.");
    }
    if (!decoded.id) { // Check for userId claim
      console.error("Authentication Error: Decoded JWT is missing 'userId' claim.", { decoded });
      throw new Error("Unauthorized: Invalid token (missing userId).");
    }
    if (!decoded.companyId) { // Check for companyId claim
      console.error("Authentication Error: Decoded JWT is missing 'companyId' claim.", { decoded });
      throw new Error("Unauthorized: Invalid token (missing companyId).");
    }

    const { fields, files } = await parseForm(req);

    if (!fields.debitNoteData) {
      throw new Error("Missing debitNoteData payload.");
    }

    const debitNoteData = JSON.parse(fields.debitNoteData);

    // Assign companyId from the authenticated user to the document
    debitNoteData.companyId = decoded.companyId;
    if (debitNoteData._id) {
      delete debitNoteData._id;
    }
    debitNoteData.createdBy = decoded.id;

    const newUploadedFiles = await uploadFiles(files.newAttachments || [], 'debit-notes', decoded.companyId);

    let existingAttachmentsFromFrontend = [];
    if (fields.existingFiles) {
        try {
            const parsed = JSON.parse(fields.existingFiles);
            existingAttachmentsFromFrontend = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
            console.warn("Failed to parse existingFiles field:", e);
            existingAttachmentsFromFrontend = [];
        }
    }
    debitNoteData.attachments = [...(existingAttachmentsFromFrontend || []), ...newUploadedFiles];

    if (!Array.isArray(debitNoteData.items) || debitNoteData.items.length === 0) {
      throw new Error("Debit Note must contain at least one item.");
    }

    debitNoteData.items = debitNoteData.items.map((item, index) => {
      if (item._id) delete item._id;

      if (item.item && !Types.ObjectId.isValid(item.item)) {
        item.item = new Types.ObjectId(item.item);
      } else if (!item.item) {
        throw new Error(`Row ${index + 1}: Item ID is required.`);
      }

      if (item.warehouse && !Types.ObjectId.isValid(item.warehouse)) {
        item.warehouse = new Types.ObjectId(item.warehouse);
      } else if (!item.warehouse) {
        throw new Error(`Row ${index + 1}: Warehouse ID is required.`);
      }

      if (item.managedBy?.toLowerCase() === "batch" && Array.isArray(item.batches)) {
        item.batches = item.batches
          .map((b) => ({
            batchCode: b.batchCode ?? b.batchNumber ?? b.batchNo,
            allocatedQuantity: Number(b.allocatedQuantity) || 0,
            expiryDate: b.expiryDate || null,
            manufacturer: b.manufacturer || '',
            unitPrice: Number(b.unitPrice) || 0,
          }))
          .filter((b) => b.batchCode && b.allocatedQuantity >= 0);
      } else {
        item.batches = [];
      }

      item.quantity = Number(item.quantity) || 0;
      return item;
    });

    for (const [i, item] of debitNoteData.items.entries()) {
      if (!item.item || !item.warehouse) {
        throw new Error(`Row ${i + 1}: Item or Warehouse ID is missing.`);
      }
      if (!Types.ObjectId.isValid(item.item)) {
        throw new Error(`Row ${i + 1}: Invalid item ID provided.`);
      }
      if (!Types.ObjectId.isValid(item.warehouse)) {
        throw new Error(`Row ${i + 1}: Invalid warehouse ID provided.`);
      }

      const quantity = Number(item.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error(`Row ${i + 1} (${item.itemCode || item.item}): Quantity to deduct must be a positive number.`);
      }

      const allowedQty = Number(item.allowedQuantity) || 0;
      if (allowedQty > 0 && quantity > allowedQty) {
        throw new Error(
          `Row ${i + 1} (${item.itemCode}): Quantity exceeds allowed (${allowedQty}).`
        );
      }
    }

    for (const [i, item] of debitNoteData.items.entries()) {
      if (item.managedBy?.toLowerCase() === "batch") {
        const totalBatchQty = (item.batches || []).reduce(
          (sum, b) => sum + (Number(b.allocatedQuantity) || 0),
          0
        );
        if (totalBatchQty !== Number(item.quantity)) {
          throw new Error(
            `Row ${i + 1} (${item.itemCode || item.item}): Batch allocated quantity mismatch. Expected ${item.quantity}, got ${totalBatchQty}.`
          );
        }
        if (item.batches.length === 0 && Number(item.quantity) > 0) {
            throw new Error(`Row ${i + 1} (${item.itemCode || item.item}): Batch managed item with quantity > 0 must have at least one batch allocated.`);
        }
      }
    }

    // Pre-check for sufficient stock before creating document
    for (const [i, item] of debitNoteData.items.entries()) {
      const itemId = new Types.ObjectId(item.item);
      const warehouseId = new Types.ObjectId(item.warehouse);
      const quantityToDeduct = Number(item.quantity);

      const inventoryDoc = await Inventory.findOne({
        item: itemId,
        warehouse: warehouseId,
        companyId: decoded.companyId, // Filter by companyId
      }).session(session);

      if (!inventoryDoc) {
        throw new Error(`Row ${i + 1} (${item.itemCode || item.item}): Inventory record not found for this item in the specified warehouse.`);
      }
      if (inventoryDoc.quantity < quantityToDeduct) {
        throw new Error(`Row ${i + 1} (${item.itemCode || item.item}): Insufficient total stock. Available: ${inventoryDoc.quantity}, Requested: ${quantityToDeduct}.`);
      }

      if (item.managedBy?.toLowerCase() === "batch") {
        const totalBatchQtyAllocated = (item.batches || []).reduce(
            (sum, b) => sum + (Number(b.allocatedQuantity) || 0), 0
        );
        if (totalBatchQtyAllocated !== quantityToDeduct) {
            throw new Error(`Row ${i + 1} (${item.itemCode || item.item}): Allocated batch quantity (${totalBatchQtyAllocated}) must match item quantity (${quantityToDeduct}).`);
        }

        for (const allocatedBatch of item.batches) {
          const batchInInventory = inventoryDoc.batches.find(
            (b) => b.batchNumber === (allocatedBatch.batchCode || allocatedBatch.batchNumber)
          );
          if (!batchInInventory || batchInInventory.quantity < allocatedBatch.allocatedQuantity) {
            throw new Error(
              `Row ${i + 1} (${item.itemCode || item.item}, Batch ${allocatedBatch.batchCode || allocatedBatch.batchNumber}): Insufficient quantity in batch. Available: ${batchInInventory?.quantity || 0}, Requested: ${allocatedBatch.allocatedQuantity}.`
            );
          }
        }
      }
    }

    const [debitNote] = await DebitNote.create([debitNoteData], { session });
    if (!debitNote) {
        throw new Error("Failed to create Debit Note.");
    }

    // Update inventory (stock DECREASE)
    for (const item of debitNoteData.items) {
      const itemId = new Types.ObjectId(item.item);
      const warehouseId = new Types.ObjectId(item.warehouse);
      const quantityToDeduct = Number(item.quantity);

      const inventoryDoc = await Inventory.findOne({
        item: itemId,
        warehouse: warehouseId,
        companyId: decoded.companyId, // Filter by companyId
      }).session(session);

      if (!inventoryDoc || inventoryDoc.quantity < quantityToDeduct) {
         throw new Error(`Concurrency error: Insufficient stock for item ${item.itemCode} during transaction.`);
      }

      inventoryDoc.quantity -= quantityToDeduct;

      if (item.managedBy?.toLowerCase() === "batch" && item.batches && item.batches.length > 0) {
          for (const allocatedBatch of item.batches) {
              const batchNumber = allocatedBatch.batchCode;
              const batchIndex = inventoryDoc.batches.findIndex(
                  (b) => b.batchNumber === batchNumber
              );

              if (batchIndex !== -1) {
                  inventoryDoc.batches[batchIndex].quantity -= allocatedBatch.allocatedQuantity;

                  if (inventoryDoc.batches[batchIndex].quantity <= 0) {
                      inventoryDoc.batches.splice(batchIndex, 1);
                  }
              } else {
                  console.warn(`Attempted to deduct from non-existent batch ${batchNumber} for item ${item.itemCode}. This should have been caught by pre-validation.`);
                  throw new Error(`Batch ${batchNumber} not found in inventory for item ${item.itemCode} during deduction. Data inconsistency.`);
              }
          }
      }
      await inventoryDoc.save({ session });
    }

    // Stock Movement Log
    for (const item of debitNoteData.items) {
        await StockMovement.create(
            [
                {
                    item: new Types.ObjectId(item.item),
                    warehouse: new Types.ObjectId(item.warehouse),
                    movementType: "OUT",
                    quantity: Number(item.quantity),
                    reference: debitNote._id,
                    referenceType: "DebitNote",
                    remarks: `Stock decreased via Debit Note (e.g., Sales Return for Outward Processing) for item ${item.itemName}.`,
                    companyId: decoded.companyId, // Assign companyId
                    createdBy: decoded.id, // Assign createdBy
                    batchDetails: item.managedBy?.toLowerCase() === "batch" ? item.batches.map(b => ({
                        batchNumber: b.batchCode,
                        quantity: b.allocatedQuantity
                    })) : [],
                },
            ],
            { session }
        );
    }

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json(
      { success: true, message: "Debit Note created and inventory updated (stock reduced).", debitNoteId: debitNote._id, debitNote: debitNote },
      { status: 201 }
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error creating Debit Note (Stock Out):", error.stack || error);
    return NextResponse.json(
      { success: false, message: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

// GET - Fetch all Debit Notes
export async function GET(req) {
  await dbConnect();
  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized: No token provided");
    const decoded = verifyJWT(token);
    // Ensure companyId is present in decoded token for filtering
    if (!decoded || !decoded.companyId) {
      console.error("Authentication Error (DebitNote GET): Decoded JWT is missing 'companyId' claim.", { decoded });
      throw new Error("Unauthorized: Invalid token (missing companyId).");
    }

    // Filter by companyId
    const debitNotes = await DebitNote.find({ companyId: decoded.companyId })
      .populate("supplier")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: debitNotes }, { status: 200 });
  } catch (error) {
    console.error("Error fetching all Debit Notes:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}