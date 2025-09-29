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

export const dynamic = 'force-dynamic';

function requestToNodeStream(req) {
  if (!req.body) throw new Error("Request body is undefined.");
  return Readable.fromWeb(req.body);
}

async function parseForm(req) {
  const form = formidable({ multiples: true });
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

/**
 * Pre-validate stock (optional if you only increase stock, but keep for safety).
 */
async function validateStockAvailability(items, companyId) {
  for (const item of items) {
    const warehouseDoc = await Warehouse.findById(item.warehouse).lean();
    if (!warehouseDoc) throw new Error(`Warehouse '${item.warehouseName}' not found.`);

    const useBins = warehouseDoc.binLocations && warehouseDoc.binLocations.length > 0;
    const query = {
      item: new Types.ObjectId(item.item),
      warehouse: new Types.ObjectId(item.warehouse),
      companyId: new Types.ObjectId(companyId),
    };

    if (useBins) {
      if (!item.selectedBin?._id) throw new Error(`A bin must be selected for '${item.itemName}'.`);
      query.bin = new Types.ObjectId(item.selectedBin._id);
    } else {
      query.bin = { $in: [null, undefined] };
    }

    // Check if inventory exists (optional)
    const inventoryDoc = await Inventory.findOne(query).lean();
    if (!inventoryDoc) continue; // For credit note, missing inventory is fine, it will create
  }
}

/**
 * Process each item: increase stock in Inventory and create StockMovement
 */
async function processItemStock(item, session, creditNote, decoded) {
  const warehouseDoc = await Warehouse.findById(item.warehouse).session(session).lean();
  if (!warehouseDoc) throw new Error(`Warehouse '${item.warehouseName}' not found.`);

  const useBins = warehouseDoc.binLocations && warehouseDoc.binLocations.length > 0;
  const query = {
    item: new Types.ObjectId(item.item),
    warehouse: new Types.ObjectId(item.warehouse),
    companyId: new Types.ObjectId(decoded.companyId),
  };
  let binId = null;
  if (useBins) {
    binId = new Types.ObjectId(item.selectedBin._id);
    query.bin = binId;
  } else {
    query.bin = { $in: [null, undefined] };
  }

  let inventoryDoc = await Inventory.findOne(query).session(session);
  if (!inventoryDoc) {
    inventoryDoc = new Inventory({
      item: new Types.ObjectId(item.item),
      warehouse: new Types.ObjectId(item.warehouse),
      bin: binId,
      companyId: decoded.companyId,
      quantity: 0,
      committed: 0,
      onOrder: 0,
      batches: [],
    });
  }

  // Batch-managed items
  if (item.managedByBatch && Array.isArray(item.batches) && item.batches.length > 0) {
    for (const batch of item.batches) {
      const batchQty = Number(batch.batchQuantity);
      if (!batch.batchNumber || batchQty <= 0) continue;

      if (!Array.isArray(inventoryDoc.batches)) inventoryDoc.batches = [];
      const batchIndex = inventoryDoc.batches.findIndex(b => b.batchNumber === batch.batchNumber);

      if (batchIndex === -1) {
        inventoryDoc.batches.push({
          batchNumber: batch.batchNumber,
          quantity: batchQty,
          expiryDate: batch.expiryDate ? new Date(batch.expiryDate) : null,
          manufacturer: batch.manufacturer || "",
          unitPrice: batch.unitPrice || 0,
          bin: binId,
        });
      } else {
        inventoryDoc.batches[batchIndex].quantity += batchQty;
      }

      inventoryDoc.quantity += batchQty;

      await StockMovement.create([{
        item: item.item,
        warehouse: item.warehouse,
        bin: binId,
        movementType: "IN",
        quantity: batchQty,
        reference: creditNote._id,
        referenceType: 'CreditNote',
        documentNumber: creditNote.documentNumberCreditNote,
        remarks: `Stock added via Credit Note (Batch ${batch.batchNumber})`,
        companyId: decoded.companyId,
        createdBy: decoded.id,
      }], { session });
    }
  } else {
    // Non-batch items
    inventoryDoc.quantity += item.quantity;

    await StockMovement.create([{
      item: item.item,
      warehouse: item.warehouse,
      bin: binId,
      movementType: "IN",
      quantity: item.quantity,
      reference: creditNote._id,
      referenceType: 'CreditNote',
      documentNumber: creditNote.documentNumberCreditNote,
      remarks: "Stock added via Credit Note",
      companyId: decoded.companyId,
      createdBy: decoded.id,
    }], { session });
  }

  await inventoryDoc.save({ session });
}

/* -------------------------- */
/* Credit Note POST API       */
/* -------------------------- */
export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();

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
      throw new Error("Credit Note must contain items.");

    // Optional: pre-validation
    await validateStockAvailability(creditNoteData.items, companyId);

    // Start transaction
    session.startTransaction();

    creditNoteData.companyId = companyId;
    delete creditNoteData._id;
    creditNoteData.createdBy = decoded.id;

    const newUploadedFiles = await uploadFiles(files.newAttachments || [], 'credit-notes', companyId);
    let existingAttachments = [];
    try { existingAttachments = JSON.parse(fields.existingFiles || '[]'); } catch {}
    creditNoteData.attachments = [...existingAttachments, ...newUploadedFiles];

    const now = new Date();
    const fyStart = now.getMonth() + 1 < 4 ? now.getFullYear() - 1 : now.getFullYear();
    const fyEnd = fyStart + 1;
    const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
    const key = "PurchaseCreditNote";

    let counter = await Counter.findOne({ id: key, companyId }).session(session);
    if (!counter) [counter] = await Counter.create([{ id: key, companyId, seq: 1 }], { session });
    else {
      counter.seq += 1;
      await counter.save({ session });
    }

    const paddedSeq = String(counter.seq).padStart(5, "0");
    creditNoteData.documentNumberCreditNote = `SALES-CREDIT/${financialYear}/${paddedSeq}`;

    const [creditNote] = await CreditNote.create([creditNoteData], { session });

    // Process stock increase
    for (const item of creditNoteData.items) {
      await processItemStock(item, session, creditNote, decoded);
    }

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ success: true, message: "Credit Note created successfully.", creditNoteId: creditNote._id }, { status: 201 });

  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    console.error("Credit Note creation error:", error);
    return NextResponse.json({ success: false, message: error.message || "Unexpected error." }, { status: 500 });
  }
}





// import { NextResponse } from "next/server";
// import mongoose, { Types } from "mongoose";
// import { v2 as cloudinary } from "cloudinary";
// import formidable from "formidable";
// import { Readable } from "stream";
// import dbConnect from "@/lib/db";
// import CreditNote from "@/models/CreditMemo";
// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import Counter from "@/models/Counter";

// // ✅ Disable Next.js default body parser
// export const config = { api: { bodyParser: false } };
// export const dynamic = "force-dynamic";

// // ✅ Cloudinary config
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // ✅ Convert request for formidable
// function createNodeCompatibleRequest(req) {
//   const nodeReq = Readable.fromWeb(req.body);
//   nodeReq.headers = Object.fromEntries(req.headers.entries());
//   nodeReq.method = req.method;
//   return nodeReq;
// }

// // ✅ Parse form-data
// async function parseForm(req) {
//   return new Promise((resolve, reject) => {
//     const form = formidable({ multiples: true, keepExtensions: true });
//     const nodeReq = createNodeCompatibleRequest(req);

//     form.parse(nodeReq, (err, fields, files) => {
//       if (err) return reject(err);

//       const parsedFields = {};
//       for (const key in fields) {
//         parsedFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
//       }

//       const parsedFiles = {};
//       for (const key in files) {
//         parsedFiles[key] = Array.isArray(files[key]) ? files[key] : [files[key]];
//       }

//       resolve({ fields: parsedFields, files: parsedFiles });
//     });
//   });
// }

// // ✅ Upload files to Cloudinary
// async function uploadFiles(fileObjects, folderName, companyId) {
//   if (!fileObjects || !fileObjects.length) return [];
//   return await Promise.all(
//     fileObjects.map(async (file) => {
//       const result = await cloudinary.uploader.upload(file.filepath, {
//         folder: `${folderName}/${companyId || "default_company"}`,
//         resource_type: "auto",
//       });
//       return {
//         fileName: file.originalFilename || result.original_filename,
//         fileUrl: result.secure_url,
//         fileType: file.mimetype,
//         publicId: result.public_id,
//         uploadedAt: new Date(),
//       };
//     })
//   );
// }

// // ✅ Delete Cloudinary files
// async function deleteFiles(publicIds) {
//   if (!Array.isArray(publicIds) || !publicIds.length) return;
//   await cloudinary.api.delete_resources(publicIds);
// }

// // ✅ Validate items
// function validateItems(items) {
//   if (!Array.isArray(items) || !items.length) {
//     throw new Error("Credit Note must have at least one item.");
//   }
//   for (const [i, item] of items.entries()) {
//     if (!item.item || !item.warehouse || item.quantity <= 0) {
//       throw new Error(`Item at row ${i + 1} is invalid.`);
//     }
//   }
// }

// // ✅ Stock Adjustment for Items
// async function adjustStock(item, type, creditNoteId, decoded, session) {
//   const qty = Number(item.quantity);
//   if (qty <= 0) return;

//   const itemId = new Types.ObjectId(item.item);
//   const warehouseId = new Types.ObjectId(item.warehouse);
//   const companyId = new Types.ObjectId(decoded.companyId);

//   let inventoryDoc = await Inventory.findOne({
//     item: itemId,
//     warehouse: warehouseId,
//     companyId,
//   }).session(session);

//   if (!inventoryDoc) {
//     [inventoryDoc] = await Inventory.create(
//       [{ item: itemId, warehouse: warehouseId, companyId, quantity: 0, batches: [] }],
//       { session }
//     );
//   }

//   inventoryDoc.quantity += type === "IN" ? qty : -qty;
//   if (inventoryDoc.quantity < 0) inventoryDoc.quantity = 0;
//   await inventoryDoc.save({ session });

//   await StockMovement.create(
//     [{
//       item: itemId,
//       warehouse: warehouseId,
//       companyId,
//       movementType: type,
//       quantity: qty,
//       reference: creditNoteId,
//       referenceType: "CreditNote",
//       remarks: `Stock ${type} for Credit Note ${creditNoteId}`,
//       createdBy: new Types.ObjectId(decoded.id),
//     }],
//     { session }
//   );
// }

// // ✅ POST: Create Credit Note
// export async function POST(req) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) throw new Error("Unauthorized: No token provided");
//     const decoded = verifyJWT(token);
//     if (!decoded?.companyId) throw new Error("Unauthorized: Invalid token");

//     const { fields, files } = await parseForm(req);
//     const creditData = JSON.parse(fields.creditMemoData || "{}");

//     validateItems(creditData.items);

//     creditData.companyId = new Types.ObjectId(decoded.companyId);
//     creditData.createdBy = new Types.ObjectId(decoded.id);
//     creditData.postingDate = new Date(creditData.postingDate);
//     creditData.validUntil = new Date(creditData.validUntil);
//     creditData.documentDate = new Date(creditData.documentDate);

//     const uploadedFiles = await uploadFiles(files.newAttachments || [], "credit-notes", decoded.companyId);
//     creditData.attachments = uploadedFiles;

//     // 🔢 Generate document number
//     const now = new Date();
//     const currentYear = now.getFullYear();
//     const currentMonth = now.getMonth() + 1;
//     const fyStart = currentMonth < 4 ? currentYear - 1 : currentYear;
//     const fyEnd = fyStart + 1;
//     const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
//     const key = `CreditNote-${financialYear}`;

//     let counter = await Counter.findOne({ id: key, companyId: decoded.companyId }).session(session);
//     if (!counter) {
//       [counter] = await Counter.create(
//         [{ id: key, companyId: decoded.companyId, seq: 1 }],
//         { session }
//       );
//     } else {
//       counter.seq += 1;
//       await counter.save({ session });
//     }

//     const paddedSeq = String(counter.seq).padStart(5, "0");
//     creditData.documentNumberCreditNote = `SALES-CRENOTE/${financialYear}/${paddedSeq}`;

//     const [creditNote] = await CreditNote.create([creditData], { session });

//     for (const item of creditData.items) {
//       if (item.stockImpact) {
//         await adjustStock(item, "IN", creditNote._id, decoded, session);
//       }
//     }

//     await session.commitTransaction();
//     return NextResponse.json({ success: true, data: creditNote }, { status: 201 });

//   } catch (error) {
//     await session.abortTransaction();
//     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
//   } finally {
//     session.endSession();
//   }
// }

// ✅ GET: Fetch all Credit Notes (with auth)
export async function GET(req) {
  await dbConnect();
  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized: No token provided");
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) throw new Error("Unauthorized: Invalid token");

    const creditNotes = await CreditNote.find({ companyId: decoded.companyId }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: creditNotes }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

