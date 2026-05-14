import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import formidable from "formidable";
import { Readable } from "stream";
import dbConnect from "@/lib/db";
import CreditNote from "@/models/CreditMemo";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import Warehouse from "@/models/warehouseModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Counter from "@/models/Counter";

const { Types } = mongoose;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = { api: { bodyParser: false } };

function requestToNodeStream(req) {
  if (!req.body) throw new Error("Request body is undefined.");
  return Readable.fromWeb(req.body);
}

async function parseForm(req) {
  const form = formidable({ multiples: true, keepExtensions: true });
  const headers = {};
  for (const [key, value] of req.headers.entries()) headers[key.toLowerCase()] = value;

  return new Promise((resolve, reject) => {
    const nodeReq = Object.assign(requestToNodeStream(req), { headers, method: req.method });
    form.parse(nodeReq, (err, fields, files) => {
      if (err) return reject(err);
      const parsedFields = {};
      for (const key in fields) parsedFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
      const parsedFiles = {};
      for (const key in files) parsedFiles[key] = Array.isArray(files[key]) ? files[key] : [files[key]];
      resolve({ fields: parsedFields, files: parsedFiles });
    });
  });
}

async function uploadFiles(fileObjects, folderName, companyId) {
  const uploadedFiles = [];
  if (!fileObjects?.length) return uploadedFiles;

  for (const file of fileObjects) {
    if (!file?.filepath) continue;
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
  }
  return uploadedFiles;
}

// ──────────────────────────────────────────────────────────────
// Helper: Process stock increase (called in POST)
// ──────────────────────────────────────────────────────────────
async function processItemStock(item, session, creditNote, decoded) {
  const warehouseDoc = await Warehouse.findById(item.warehouse).session(session).lean();
  if (!warehouseDoc) throw new Error(`Warehouse '${item.warehouseName}' not found.`);

  const useBins = warehouseDoc.binLocations?.length > 0;
  const variantId = item.variant?.variantId || item.selectedVariantId;
  const query = {
    companyId: new Types.ObjectId(decoded.companyId),
    item: new Types.ObjectId(item.item),
    warehouse: new Types.ObjectId(item.warehouse),
  };
  let binId = null;
  if (useBins) {
    const binIdValue = item.selectedBin?._id || item.selectedBin;
    if (!binIdValue) throw new Error(`Bin required for item '${item.itemName}'.`);
    binId = new Types.ObjectId(binIdValue);
    query.bin = binId;
  } else {
    query.bin = { $in: [null, undefined] };
  }

  let inventory = await Inventory.findOne(query).session(session);
  if (!inventory) {
    inventory = new Inventory({
      companyId: decoded.companyId,
      item: new Types.ObjectId(item.item),
      warehouse: new Types.ObjectId(item.warehouse),
      bin: binId,
      quantity: 0,
      committed: 0,
      onOrder: 0,
      hasVariants: !!variantId,
      variantInventory: [],
    });
  }

  const isBatchManaged = item.managedBy?.toLowerCase() === "batch";
  const quantityToAdd = Number(item.quantity) || 0;

  if (variantId) {
    let variantInv = inventory.variantInventory.find(v => v.variantId.toString() === variantId.toString());
    if (!variantInv) {
      variantInv = {
        variantId: new Types.ObjectId(variantId),
        sku: item.itemCode,
        quantity: 0,
        committed: 0,
        onOrder: 0,
        batches: [],
      };
      inventory.variantInventory.push(variantInv);
    }
    if (isBatchManaged && item.batches?.length) {
      for (const batch of item.batches) {
        const batchQty = Number(batch.batchQuantity) || 0;
        if (!batch.batchNumber || batchQty <= 0) continue;
        let batchInv = variantInv.batches.find(b => b.batchNumber === batch.batchNumber);
        if (!batchInv) {
          batchInv = {
            batchNumber: batch.batchNumber,
            expiryDate: batch.expiryDate ? new Date(batch.expiryDate) : null,
            manufacturer: batch.manufacturer || "",
            batchQuantity: 0,
          };
          variantInv.batches.push(batchInv);
        }
        batchInv.batchQuantity += batchQty;
        variantInv.quantity += batchQty;
      }
    } else {
      variantInv.quantity += quantityToAdd;
    }
  } else {
    if (isBatchManaged && item.batches?.length) {
      for (const batch of item.batches) {
        const batchQty = Number(batch.batchQuantity) || 0;
        if (!batch.batchNumber || batchQty <= 0) continue;
        let batchInv = inventory.batches.find(b => b.batchNumber === batch.batchNumber);
        if (!batchInv) {
          batchInv = {
            batchNumber: batch.batchNumber,
            expiryDate: batch.expiryDate ? new Date(batch.expiryDate) : null,
            manufacturer: batch.manufacturer || "",
            batchQuantity: 0,
          };
          inventory.batches.push(batchInv);
        }
        batchInv.batchQuantity += batchQty;
        inventory.quantity += batchQty;
      }
    } else {
      inventory.quantity += quantityToAdd;
    }
  }

  await inventory.save({ session });

  await StockMovement.create([{
    companyId: decoded.companyId,
    createdBy: decoded.id,
    item: new Types.ObjectId(item.item),
    variantId: variantId ? new Types.ObjectId(variantId) : null,
    warehouse: new Types.ObjectId(item.warehouse),
    bin: binId,
    movementType: "IN",
    quantity: quantityToAdd,
    reference: creditNote._id,
    referenceType: "CreditNote",
    documentNumber: creditNote.documentNumberCreditNote,
    remarks: `Stock added via Credit Note (${isBatchManaged ? 'Batch managed' : 'Direct'})`,
    date: new Date(),
  }], { session });
}

// ──────────────────────────────────────────────────────────────
// Helper: Revert stock when Credit Note is cancelled
// ──────────────────────────────────────────────────────────────
async function revertStockForCreditNote(creditNote, decoded, session) {
  for (const item of creditNote.items) {
    const warehouse = await Warehouse.findById(item.warehouse).session(session);
    if (!warehouse) continue;
    const useBins = warehouse.binLocations?.length > 0;
    const variantId = item.variant?.variantId || item.selectedVariantId;
    const query = {
      companyId: new Types.ObjectId(decoded.companyId),
      item: new Types.ObjectId(item.item),
      warehouse: new Types.ObjectId(item.warehouse),
    };
    if (useBins && (item.selectedBin?._id || item.selectedBin)) {
      const binId = item.selectedBin?._id || item.selectedBin;
      query.bin = new Types.ObjectId(binId);
    } else {
      query.bin = { $in: [null, undefined] };
    }
    const inventory = await Inventory.findOne(query).session(session);
    if (inventory) {
      const isBatchManaged = item.managedBy?.toLowerCase() === "batch";
      const quantityToRemove = Number(item.quantity) || 0;

      if (variantId) {
        let variantInv = inventory.variantInventory.find(v => v.variantId.toString() === variantId.toString());
        if (variantInv) {
          if (isBatchManaged && item.batches?.length) {
            for (const batch of item.batches) {
              const batchQty = Number(batch.batchQuantity) || 0;
              const batchInv = variantInv.batches.find(b => b.batchNumber === batch.batchNumber);
              if (batchInv) batchInv.batchQuantity -= batchQty;
              variantInv.quantity -= batchQty;
            }
          } else {
            variantInv.quantity -= quantityToRemove;
          }
        }
      } else {
        if (isBatchManaged && item.batches?.length) {
          for (const batch of item.batches) {
            const batchQty = Number(batch.batchQuantity) || 0;
            const batchInv = inventory.batches.find(b => b.batchNumber === batch.batchNumber);
            if (batchInv) batchInv.batchQuantity -= batchQty;
            inventory.quantity -= batchQty;
          }
        } else {
          inventory.quantity -= quantityToRemove;
        }
      }
      await inventory.save({ session });
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Retry helper for WriteConflict
// ──────────────────────────────────────────────────────────────
async function runTransactionWithRetry(fn, session, retries = 3, delayMs = 100) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn(session);
    } catch (error) {
      if (error.codeName === 'WriteConflict' || error.code === 112) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
        continue;
      }
      throw error;
    }
  }
}

// ──────────────────────────────────────────────────────────────
// POST – Create Credit Note
// ──────────────────────────────────────────────────────────────
export async function POST(req) {
  await dbConnect();
  let session = null;

  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized: No token provided.");
    const decoded = verifyJWT(token);
    const companyId = decoded?.companyId;
    if (!decoded?.id || !companyId) throw new Error("Unauthorized: Invalid token.");

    const { fields, files } = await parseForm(req);
    if (!fields.creditNoteData) throw new Error("Missing creditNoteData payload.");

    const creditNoteData = JSON.parse(fields.creditNoteData);
    if (!Array.isArray(creditNoteData.items) || creditNoteData.items.length === 0)
      throw new Error("Credit Note must contain at least one item.");

    session = await mongoose.startSession();
    let creditNote;

    await runTransactionWithRetry(async (session) => {
      await session.withTransaction(async (session) => {
        creditNoteData.companyId = companyId;
        delete creditNoteData._id;
        creditNoteData.createdBy = decoded.id;

        // Attachments
        const newUploadedFiles = await uploadFiles(files.newAttachments || [], 'credit-notes', companyId);
        let existingAttachments = [];
        try { existingAttachments = JSON.parse(fields.existingFiles || '[]'); } catch {}
        creditNoteData.attachments = [...existingAttachments, ...newUploadedFiles];

        // Generate document number
        const now = new Date();
        const financialYear = now.getMonth() >= 3
          ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(-2)}`
          : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(-2)}`;
        const key = "SalesCreditNote";

        let counter = await Counter.findOne({ id: key, companyId }).session(session);
        if (!counter) {
          [counter] = await Counter.create([{ id: key, companyId, seq: 1 }], { session });
        } else {
          counter.seq += 1;
          await counter.save({ session });
        }
        creditNoteData.documentNumberCreditNote = `SALES-CREDIT/${financialYear}/${String(counter.seq).padStart(5, "0")}`;

        // Dates
        creditNoteData.postingDate = creditNoteData.postingDate ? new Date(creditNoteData.postingDate) : new Date();
        creditNoteData.documentDate = creditNoteData.documentDate ? new Date(creditNoteData.documentDate) : new Date();
        creditNoteData.validUntil = creditNoteData.validUntil ? new Date(creditNoteData.validUntil) : null;

        // Create Credit Note
        [creditNote] = await CreditNote.create([creditNoteData], { session });

        // Increase stock
        for (const item of creditNoteData.items) {
          await processItemStock(item, session, creditNote, decoded);
        }
      });
    }, session);

    session.endSession();
    return NextResponse.json({ success: true, message: "Credit Note created successfully.", data: creditNote }, { status: 201 });

  } catch (error) {
    if (session && session.inTransaction()) await session.abortTransaction();
    if (session) await session.endSession();
    console.error("Credit Note POST error:", error);
    const status = error.message.toLowerCase().includes("stock") ? 422 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

// ──────────────────────────────────────────────────────────────
// GET – List or single Credit Note
// ──────────────────────────────────────────────────────────────
export async function GET(req) {
  await dbConnect();
  try {
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id && Types.ObjectId.isValid(id)) {
      const creditNote = await CreditNote.findOne({ _id: id, companyId: decoded.companyId })
        .populate("customer", "customerCode customerName")
        .populate("items.item", "itemCode itemName imageUrl variants");
      if (!creditNote) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: creditNote });
    }

    const creditNotes = await CreditNote.find({ companyId: decoded.companyId })
      .populate("customer", "customerCode customerName")
      .sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: creditNotes }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────
// PUT – Update Credit Note (only non‑stock fields)
// ──────────────────────────────────────────────────────────────
export async function PUT(req) {
  await dbConnect();
  let session = null;
  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized");
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) throw new Error("Invalid token");

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Valid ID required" }, { status: 400 });
    }

    const { fields, files } = await parseForm(req);
    const creditNoteData = JSON.parse(fields.creditNoteData || "{}");

    session = await mongoose.startSession();
    session.startTransaction();

    const existing = await CreditNote.findOne({ _id: id, companyId: decoded.companyId }).session(session);
    if (!existing) throw new Error("Credit Note not found");

    // Handle attachments
    const removedPublicIds = creditNoteData.removedFiles?.map(f => f.publicId) || [];
    const existingFiles = creditNoteData.existingFiles || [];
    for (const pubId of removedPublicIds) {
      await cloudinary.uploader.destroy(pubId).catch(e => console.warn(e));
    }
    const newFiles = files.newAttachments || [];
    const uploadedFiles = await uploadFiles(newFiles, 'credit-notes', decoded.companyId);

    const updatePayload = {
      status: creditNoteData.status,
      remarks: creditNoteData.remarks,
      reasonForReturn: creditNoteData.reasonForReturn,
      freight: Number(creditNoteData.freight) || 0,
      rounding: Number(creditNoteData.rounding) || 0,
      totalBeforeDiscount: Number(creditNoteData.totalBeforeDiscount) || 0,
      gstTotal: Number(creditNoteData.gstTotal) || 0,
      grandTotal: Number(creditNoteData.grandTotal) || 0,
      attachments: [...existingFiles, ...uploadedFiles],
      updatedAt: new Date(),
    };

    const updated = await CreditNote.findByIdAndUpdate(id, updatePayload, { new: true, session });
    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ success: true, message: "Credit Note updated", data: updated });
  } catch (error) {
    if (session && session.inTransaction()) await session.abortTransaction();
    if (session) await session.endSession();
    console.error("Credit Note PUT error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────
// DELETE – Cancel Credit Note (revert stock)
// ──────────────────────────────────────────────────────────────
export async function DELETE(req) {
  await dbConnect();
  let session = null;
  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized");
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) throw new Error("Invalid token");

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Valid ID required" }, { status: 400 });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    const creditNote = await CreditNote.findOne({ _id: id, companyId: decoded.companyId }).session(session);
    if (!creditNote) throw new Error("Credit Note not found");
    if (creditNote.status === "Cancelled") throw new Error("Credit Note already cancelled");

    // Revert stock
    await revertStockForCreditNote(creditNote, decoded, session);

    // Soft delete
    creditNote.status = "Cancelled";
    await creditNote.save({ session });

    // Delete attachments from Cloudinary
    if (creditNote.attachments?.length) {
      const publicIds = creditNote.attachments.map(a => a.publicId).filter(Boolean);
      for (const pubId of publicIds) {
        await cloudinary.uploader.destroy(pubId).catch(e => console.warn(e));
      }
    }

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ success: true, message: "Credit Note cancelled, stock reverted" });
  } catch (error) {
    if (session && session.inTransaction()) await session.abortTransaction();
    if (session) await session.endSession();
    console.error("Credit Note DELETE error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}