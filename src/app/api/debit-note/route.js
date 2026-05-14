import { NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import formidable from "formidable";
import { Readable } from "stream";
import dbConnect from "@/lib/db";
import DebitNote from "@/models/DebitNoteModel";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import Warehouse from "@/models/warehouseModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Counter from "@/models/Counter";
import item from "@/models/ItemModels";
import supplier from "@/models/SupplierModels";

export const dynamic = 'force-dynamic';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ========== Helper Functions ==========

function createNodeCompatibleRequest(req) {
  const nodeReq = Readable.fromWeb(req.body);
  nodeReq.headers = Object.fromEntries(req.headers.entries());
  nodeReq.method = req.method;
  return nodeReq;
}

async function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: true, keepExtensions: true });
    const nodeReq = createNodeCompatibleRequest(req);
    form.parse(nodeReq, (err, fields, files) => {
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

async function uploadFiles(fileObjects, folderName, companyId) {
  const uploadedFiles = [];
  const fileArray = Array.isArray(fileObjects) ? fileObjects : [];
  for (const file of fileArray) {
    if (!file || !file.filepath) continue;
    const result = await cloudinary.uploader.upload(file.filepath, {
      folder: `${folderName}/${companyId || 'default_company'}`,
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
  }
  return uploadedFiles;
}

async function deleteFilesByPublicIds(publicIds) {
  if (!publicIds || publicIds.length === 0) return;
  for (const publicId of publicIds) {
    try { await cloudinary.uploader.destroy(publicId); }
    catch (err) { console.error("Cloudinary delete error:", err); }
  }
}

// ✅ CORRECTED: Validate stock for variants as well
async function validateStockForItems(items, companyId) {
  for (const item of items) {
    const warehouseId = item.warehouse?._id || item.warehouse;
    if (!warehouseId) throw new Error(`Warehouse missing for item ${item.itemCode || item.itemName}`);
    const warehouse = await Warehouse.findById(warehouseId).lean();
    if (!warehouse) throw new Error(`Warehouse not found for ${item.itemCode}`);

    const variantId = item.variant?.variantId || item.selectedVariantId;
    const query = {
      companyId: new Types.ObjectId(companyId),
      item: new Types.ObjectId(item.item),
      warehouse: new Types.ObjectId(warehouseId),
    };
    const inventory = await Inventory.findOne(query).lean();
    if (!inventory) throw new Error(`No inventory found for ${item.itemName} in ${warehouse.warehouseName}`);

    let availableQty = 0;
    if (variantId) {
      // Variant item: look inside variantInventory
      const variantInv = inventory.variantInventory?.find(v => v.variantId.toString() === variantId.toString());
      if (!variantInv) throw new Error(`Variant ${item.itemCode} not found in inventory`);
      availableQty = variantInv.quantity;
    } else {
      // Regular item
      availableQty = inventory.quantity;
    }

    if (availableQty < item.quantity) {
      throw new Error(`Insufficient stock for ${item.itemName}${variantId ? ` (${item.itemCode})` : ''}. Required: ${item.quantity}, Available: ${availableQty}`);
    }
  }
}

// ✅ CORRECTED: Deduct stock from the correct variant
async function processDebitNoteItem(item, debitNoteId, decoded, session) {
  const warehouseId = item.warehouse?._id || item.warehouse;
  const warehouse = await Warehouse.findById(warehouseId).session(session);
  if (!warehouse) throw new Error(`Warehouse not found`);

  const variantId = item.variant?.variantId || item.selectedVariantId;
  const query = {
    companyId: new Types.ObjectId(decoded.companyId),
    item: new Types.ObjectId(item.item),
    warehouse: new Types.ObjectId(warehouseId),
  };
  const inventory = await Inventory.findOne(query).session(session);
  if (!inventory) throw new Error(`Inventory record not found for ${item.itemName}`);

  if (variantId) {
    // Find variant inventory
    let variantInv = inventory.variantInventory.find(v => v.variantId.toString() === variantId.toString());
    if (!variantInv) throw new Error(`Variant ${item.itemCode} not found in inventory`);
    if (variantInv.quantity < item.quantity) {
      throw new Error(`Insufficient stock for variant ${item.itemCode}`);
    }
    variantInv.quantity -= item.quantity;
  } else {
    if (inventory.quantity < item.quantity) {
      throw new Error(`Insufficient stock for ${item.itemName}`);
    }
    inventory.quantity -= item.quantity;
  }
  await inventory.save({ session });

  // Create stock movement record
  await StockMovement.create([{
    companyId: decoded.companyId,
    createdBy: decoded.id,
    item: new Types.ObjectId(item.item),
    variantId: variantId ? new Types.ObjectId(variantId) : null,
    warehouse: new Types.ObjectId(warehouseId),
    movementType: "OUT",
    quantity: item.quantity,
    reference: debitNoteId,
    referenceType: "DebitNote",
    remarks: `Stock out via Debit Note`,
    date: new Date()
  }], { session });
}

// ========== POST ==========
export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();

  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized");
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) throw new Error("Invalid token");

    const { fields, files } = await parseForm(req);
    const debitNoteData = JSON.parse(fields.debitNoteData || "{}");
    if (!debitNoteData.items?.length) throw new Error("At least one item required");

    // ✅ Pre‑validate stock (variant‑aware)
    await validateStockForItems(debitNoteData.items, decoded.companyId);

    session.startTransaction();

    // Handle attachments
    const removedFilesPublicIds = JSON.parse(fields.removedFiles || "[]");
    const existingFilesMetadata = JSON.parse(fields.existingFiles || "[]");
    const newUploadedFiles = await uploadFiles(files.newAttachments || [], "debit-notes", decoded.companyId);
    debitNoteData.attachments = [
      ...(existingFilesMetadata.filter(f => !removedFilesPublicIds.includes(f.publicId))),
      ...newUploadedFiles,
    ];
    await deleteFilesByPublicIds(removedFilesPublicIds);

    debitNoteData.companyId = decoded.companyId;
    debitNoteData.createdBy = decoded.id;
    delete debitNoteData._id;

    // Generate document number
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    let fyStart = currentYear, fyEnd = currentYear + 1;
    if (currentMonth < 4) { fyStart = currentYear - 1; fyEnd = currentYear; }
    const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
    const key = "PurchaseDebitNote";

    let counter = await Counter.findOne({ id: key, companyId: decoded.companyId }).session(session);
    if (!counter) {
      const [created] = await Counter.create([{ id: key, companyId: decoded.companyId, seq: 1 }], { session });
      counter = created;
    } else {
      counter.seq += 1;
      await counter.save({ session });
    }
    debitNoteData.documentNumberDebitNote = `PURCH-DEBIT/${financialYear}/${String(counter.seq).padStart(5, "0")}`;

    const [debitNote] = await DebitNote.create([debitNoteData], { session });

    // Process each item (deduct stock)
    for (const item of debitNoteData.items) {
      await processDebitNoteItem(item, debitNote._id, decoded, session);
    }

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ success: true, message: "Debit Note created", data: debitNote }, { status: 201 });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    console.error("POST /api/debit-note error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ========== GET ==========
export async function GET(req) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");

    if (id) {
      const debitNote = await DebitNote.findOne({ _id: id, companyId: decoded.companyId })
        .populate("supplier", "supplierCode supplierName")
        .populate("items.item", "itemCode itemName imageUrl variants");
      if (!debitNote) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: debitNote });
    }

    const query = { companyId: decoded.companyId };
    if (status && status !== "All") query.status = status;
    if (search) {
      query.$or = [
        { documentNumberDebitNote: { $regex: search, $options: "i" } },
        { supplierName: { $regex: search, $options: "i" } },
        { refNumber: { $regex: search, $options: "i" } }
      ];
    }

    const skip = (page - 1) * limit;
    const [debitNotes, total] = await Promise.all([
      DebitNote.find(query)
        .populate("supplier", "supplierName supplierCode")
        .populate("items.item", "itemCode itemName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DebitNote.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      data: debitNotes,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error("GET /api/debit-note error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ========== PUT ==========
export async function PUT(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

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
    const debitNoteData = JSON.parse(fields.debitNoteData || "{}");
    const removedFilesPublicIds = JSON.parse(fields.removedFiles || "[]");
    const existingFilesMetadata = JSON.parse(fields.existingFiles || "[]");

    // Find existing – we do not reverse stock for now (only meta updates)
    const existing = await DebitNote.findOne({ _id: id, companyId: decoded.companyId }).session(session);
    if (!existing) throw new Error("Debit Note not found");

    // Handle attachments
    const newUploadedFiles = await uploadFiles(files.newAttachments || [], "debit-notes", decoded.companyId);
    debitNoteData.attachments = [
      ...(existingFilesMetadata.filter(f => !removedFilesPublicIds.includes(f.publicId))),
      ...newUploadedFiles,
    ];
    await deleteFilesByPublicIds(removedFilesPublicIds);

    // Only allow meta updates (status, remarks, attachments)
    const updatePayload = {
      status: debitNoteData.status,
      remarks: debitNoteData.remarks,
      attachments: debitNoteData.attachments,
      updatedAt: new Date(),
    };

    const updated = await DebitNote.findByIdAndUpdate(id, updatePayload, { new: true, session });
    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ success: true, message: "Debit Note updated", data: updated });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    console.error("PUT /api/debit-note error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ========== DELETE ==========
export async function DELETE(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

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

    const debitNote = await DebitNote.findOne({ _id: id, companyId: decoded.companyId }).session(session);
    if (!debitNote) throw new Error("Debit Note not found");

    // Restore stock (reverse the deduction)
    for (const item of debitNote.items) {
      const warehouseId = item.warehouse?._id || item.warehouse;
      if (!warehouseId) continue;
      const variantId = item.variant?.variantId || item.selectedVariantId;

      const query = {
        companyId: new Types.ObjectId(decoded.companyId),
        item: new Types.ObjectId(item.item),
        warehouse: new Types.ObjectId(warehouseId),
      };
      const inventory = await Inventory.findOne(query).session(session);
      if (inventory) {
        if (variantId) {
          const variantInv = inventory.variantInventory.find(v => v.variantId.toString() === variantId.toString());
          if (variantInv) variantInv.quantity += item.quantity;
        } else {
          inventory.quantity += item.quantity;
        }
        await inventory.save({ session });
      }
    }

    // Delete attachments from Cloudinary
    if (debitNote.attachments?.length) {
      const publicIds = debitNote.attachments.map(a => a.publicId).filter(Boolean);
      await deleteFilesByPublicIds(publicIds);
    }

    await DebitNote.deleteOne({ _id: id }).session(session);
    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ success: true, message: "Debit Note deleted and stock restored" });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    session.endSession();
    console.error("DELETE /api/debit-note error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}



// import { NextResponse } from "next/server";
// import mongoose from "mongoose";
// import { v2 as cloudinary } from "cloudinary";
// import formidable from "formidable";
// import { Readable } from "stream";
// import dbConnect from "@/lib/db";
// import DebitNote from "@/models/DebitNoteModel";

// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";
// import Warehouse from "@/models/warehouseModels"; // Import the Warehouse model
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import Counter from "@/models/Counter";

// const { Types } = mongoose;

// // --- Configuration ---
// cloudinary.config({
//  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//  api_key: process.env.CLOUDINARY_API_KEY,
//  api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// export const dynamic = 'force-dynamic';

// // --- Helper Functions for File Parsing and Uploading ---
// function requestToNodeStream(req) {
//  if (!req.body) throw new Error("Request body is undefined.");
//  return Readable.fromWeb(req.body);
// }

// async function parseForm(req) {
//  const form = formidable({ multiples: true });
//  const headers = {};
//  for (const [key, value] of req.headers.entries()) headers[key.toLowerCase()] = value;
//  return new Promise((resolve, reject) => {
//   const nodeReq = Object.assign(requestToNodeStream(req), { headers, method: req.method });
//   form.parse(nodeReq, (err, fields, files) => {
//    if (err) return reject(err);
//    const parsedFields = {};
//    for (const key in fields) parsedFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
//    const parsedFiles = {};
//    for (const key in files) parsedFiles[key] = Array.isArray(files[key]) ? files[key] : [files[key]];
//    resolve({ fields: parsedFields, files: parsedFiles });
//   });
//  });
// }

// async function uploadFiles(fileObjects, folderName, companyId) {
//  const uploadedFiles = [];
//  if (!fileObjects?.length) return uploadedFiles;
//  for (const file of fileObjects) {
//   if (!file?.filepath) continue;
//   const result = await cloudinary.uploader.upload(file.filepath, {
//    folder: `${folderName}/${companyId || 'default_company_attachments'}`,
//    resource_type: "auto",
//     original_filename: file.originalFilename,
//   });
//   uploadedFiles.push({
//    fileName: file.originalFilename,
//    fileUrl: result.secure_url,
//    fileType: file.mimetype,
//    uploadedAt: new Date(),
//    publicId: result.public_id,
//   });
//  }
//  return uploadedFiles;
// }


// /**
//  * Pre-validates stock for all items before starting the database transaction.
//  */
// async function validateStockAvailability(items, companyId) {
//     for (const item of items) {
//         const warehouseDoc = await Warehouse.findById(item.warehouse).lean();
//         if (!warehouseDoc) throw new Error(`Warehouse '${item.warehouseName}' not found.`);
        
//         const useBins = warehouseDoc.binLocations && warehouseDoc.binLocations.length > 0;
//         const query = {
//             item: new Types.ObjectId(item.item),
//             warehouse: new Types.ObjectId(item.warehouse),
//             companyId: new Types.ObjectId(companyId),
//         };

//         if (useBins) {
//             if (!item.selectedBin?._id) throw new Error(`A bin must be selected for '${item.itemName}'.`);
//             query.bin = new Types.ObjectId(item.selectedBin._id);
//         } else {
//             query.bin = { $in: [null, undefined] };
//         }

//         const inventoryDoc = await Inventory.findOne(query).lean();
//         const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;

//         if (!inventoryDoc) throw new Error(`Stock Check Failed: No inventory for '${item.itemName}' in ${location}.`);
//         if (inventoryDoc.quantity < item.quantity) {
//             throw new Error(`Stock Check Failed: Insufficient stock for '${item.itemName}' in ${location}. Required: ${item.quantity}, Available: ${inventoryDoc.quantity}.`);
//         }
//     }
// }

// /**
//  * Processes a single item's stock deduction within a database transaction.
//  */
// async function processItemForDebitNote(item, session, debitNote, decoded) {
//     const warehouseDoc = await Warehouse.findById(item.warehouse).session(session).lean();
//     if (!warehouseDoc) throw new Error(`Warehouse '${item.warehouseName}' not found.`);
    
//     const useBins = warehouseDoc.binLocations && warehouseDoc.binLocations.length > 0;
//     const query = {
//         item: new Types.ObjectId(item.item),
//         warehouse: new Types.ObjectId(item.warehouse),
//         companyId: new Types.ObjectId(decoded.companyId),
//     };
//     let binId = null;

//     if (useBins) {
//         binId = new Types.ObjectId(item.selectedBin._id);
//         query.bin = binId;
//     } else {
//         query.bin = { $in: [null, undefined] };
//     }

//     const inventoryDoc = await Inventory.findOne(query).session(session);
//     if (!inventoryDoc) {
//         const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;
//         throw new Error(`Transaction failed: Inventory record for '${item.itemName}' in ${location} disappeared.`);
//     }

//     if (inventoryDoc.quantity < item.quantity) {
//         const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;
//         throw new Error(`Transaction failed due to insufficient stock for '${item.itemName}' in ${location}.`);
//     }

//     inventoryDoc.quantity -= item.quantity;
    
//     await StockMovement.create([{
//         item: item.item,
//         warehouse: item.warehouse,
//         bin: binId,
//         movementType: "OUT",
//         quantity: item.quantity,
//         reference: debitNote._id,
//         referenceType: 'DebitNote',
//         documentNumber: debitNote.documentNumberDebitNote,
//         remarks: `Stock out via Debit Note: ${debitNote.documentNumberDebitNote}`,
//         companyId: decoded.companyId,
//         createdBy: decoded.id,
//     }], { session });

//     await inventoryDoc.save({ session });
// }

// /* ------------------------------------------- */
// /* ---------- API HANDLER (POST) ---------- */
// /* ------------------------------------------- */
// export async function POST(req) {
//     await dbConnect();
//     const session = await mongoose.startSession();

//     try {
//         const token = getTokenFromHeader(req);
//         if (!token) throw new Error("Unauthorized: No token provided.");
//         const decoded = verifyJWT(token);
//         const companyId = decoded?.companyId;
//         if (!decoded?.id || !companyId) throw new Error("Unauthorized: Invalid token.");

//         const { fields, files } = await parseForm(req);
//         if (!fields.debitNoteData) throw new Error("Missing debitNoteData payload.");

//         const debitNoteData = JSON.parse(fields.debitNoteData);
//         if (!Array.isArray(debitNoteData.items) || debitNoteData.items.length === 0) throw new Error("Debit Note must contain items.");

//         // ✅ 1. PRE-VALIDATION: Check stock availability BEFORE starting the transaction.
//         await validateStockAvailability(debitNoteData.items, companyId);
        
//         // ✅ 2. START TRANSACTION: If stock is available, begin the database transaction.
//         session.startTransaction();

//         debitNoteData.companyId = companyId;
//         delete debitNoteData._id;
//         debitNoteData.createdBy = decoded.id;

//         const newUploadedFiles = await uploadFiles(files.newAttachments || [], 'debit-notes', companyId);
//         let existingAttachments = [];
//         try { existingAttachments = JSON.parse(fields.existingFiles || '[]'); } catch {}
//         debitNoteData.attachments = [...existingAttachments, ...newUploadedFiles];

//         const now = new Date();
//         const fyStart = now.getMonth() + 1 < 4 ? now.getFullYear() - 1 : now.getFullYear();
//         const fyEnd = fyStart + 1;
//         const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
//         const key = "PurchaseDebitNote";
//         let counter = await Counter.findOne({ id: key, companyId }).session(session);
//         if (!counter) [counter] = await Counter.create([{ id: key, companyId, seq: 1 }], { session });
//         else {
//             counter.seq += 1;
//             await counter.save({ session });
//         }
//         const paddedSeq = String(counter.seq).padStart(5, "0");
//         debitNoteData.documentNumberDebitNote = `PURCH-DEBIT/${financialYear}/${paddedSeq}`;

//         const [debitNote] = await DebitNote.create([debitNoteData], { session });

//         // ✅ 3. PROCESS ITEMS: Deduct stock from the correct bins.
//         for (const item of debitNoteData.items) {
//             await processItemForDebitNote(item, session, debitNote, decoded);
//         }

//         // ✅ 4. COMMIT: If all steps succeed, commit the transaction.
//         await session.commitTransaction();
//         session.endSession();
//         return NextResponse.json({ success: true, message: "Debit Note created successfully.", debitNoteId: debitNote._id }, { status: 201 });

//     } catch (error) {
//         // ✅ 5. ABORT: If any error occurs, abort the transaction.
//         if (session.inTransaction()) {
//             await session.abortTransaction();
//         }
//         session.endSession();
//         console.error("Debit Note creation error:", error);
//         return NextResponse.json({ success: false, message: error.message || "Unexpected error." }, { status: 500 });
//     }
// }


// import { NextResponse } from "next/server";
// import mongoose from "mongoose";
// import { v2 as cloudinary } from "cloudinary";
// import formidable from "formidable";
// import { Readable } from "stream";
// import dbConnect from "@/lib/db";
// import DebitNote from "@/models/DebitNoteModel";
// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import Counter from "@/models/Counter";

// const { Types } = mongoose;

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// function requestToNodeStream(req) {
//   if (!req.body) throw new Error("Request body is undefined.");
//   return Readable.fromWeb(req.body);
// }

// async function parseForm(req) {
//   const form = formidable({ multiples: true });
//   const headers = {};
//   for (const [key, value] of req.headers.entries()) headers[key.toLowerCase()] = value;
//   return new Promise((resolve, reject) => {
//     const nodeReq = Object.assign(requestToNodeStream(req), { headers, method: req.method });
//     form.parse(nodeReq, (err, fields, files) => {
//       if (err) return reject(err);
//       const parsedFields = {};
//       for (const key in fields) parsedFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
//       const parsedFiles = {};
//       for (const key in files) parsedFiles[key] = Array.isArray(files[key]) ? files[key] : [files[key]];
//       resolve({ fields: parsedFields, files: parsedFiles });
//     });
//   });
// }

// async function uploadFiles(fileObjects, folderName, companyId) {
//   const uploadedFiles = [];
//   if (!fileObjects?.length) return uploadedFiles;
//   for (const file of fileObjects) {
//     if (!file?.filepath) continue;
//     const result = await cloudinary.uploader.upload(file.filepath, {
//       folder: `${folderName}/${companyId || 'default_company_attachments'}`,
//       resource_type: "auto",
//       original_filename: file.originalFilename,
//     });
//     uploadedFiles.push({
//       fileName: file.originalFilename,
//       fileUrl: result.secure_url,
//       fileType: file.mimetype,
//       uploadedAt: new Date(),
//       publicId: result.public_id,
//     });
//   }
//   return uploadedFiles;
// }

// export const dynamic = 'force-dynamic';

// export async function POST(req) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) throw new Error("Unauthorized: No token provided.");
//     const decoded = verifyJWT(token);
//     const companyId = decoded?.companyId;
//     if (!decoded?.id || !companyId) throw new Error("Unauthorized: Invalid token.");

//     const { fields, files } = await parseForm(req);
//     if (!fields.debitNoteData) throw new Error("Missing debitNoteData payload.");

//     const debitNoteData = JSON.parse(fields.debitNoteData);
//     debitNoteData.companyId = companyId;
//     delete debitNoteData._id;
//     debitNoteData.createdBy = decoded.id;

//     const newUploadedFiles = await uploadFiles(files.newAttachments || [], 'debit-notes', companyId);
//     let existingAttachments = [];
//     try {
//       existingAttachments = JSON.parse(fields.existingFiles || '[]');
//     } catch {}
//     debitNoteData.attachments = [...existingAttachments, ...newUploadedFiles];

//     if (!Array.isArray(debitNoteData.items) || debitNoteData.items.length === 0) throw new Error("Debit Note must contain items.");

//     debitNoteData.items = debitNoteData.items.map((item, index) => {
//       delete item._id;
//       item.item = Types.ObjectId.isValid(item.item) ? item.item : new Types.ObjectId(item.item);
//       item.warehouse = Types.ObjectId.isValid(item.warehouse) ? item.warehouse : new Types.ObjectId(item.warehouse);
//       item.quantity = Number(item.quantity) || 0;
//       if (item.managedBy?.toLowerCase() === "batch" && Array.isArray(item.batches)) {
//         item.batches = item.batches.map((b) => ({
//           batchCode: b.batchCode ?? b.batchNumber,
//           allocatedQuantity: Number(b.allocatedQuantity) || 0,
//           expiryDate: b.expiryDate || null,
//           manufacturer: b.manufacturer || '',
//           unitPrice: Number(b.unitPrice) || 0,
//         })).filter(b => b.batchCode);
//       } else item.batches = [];
//       return item;
//     });

//     for (const [i, item] of debitNoteData.items.entries()) {
//       const inventory = await Inventory.findOne({
//         item: item.item,
//         warehouse: item.warehouse,
//         companyId
//       }).session(session);
//       if (!inventory || inventory.quantity < item.quantity) throw new Error(`Row ${i + 1}: Insufficient stock.`);
//       if (item.managedBy?.toLowerCase() === "batch") {
//         const totalAllocated = item.batches.reduce((sum, b) => sum + b.allocatedQuantity, 0);
//         if (totalAllocated !== item.quantity) throw new Error(`Row ${i + 1}: Batch quantity mismatch.`);
//         for (const b of item.batches) {
//           const invBatch = inventory.batches.find(batch => batch.batchNumber === b.batchCode);
//           if (!invBatch || invBatch.quantity < b.allocatedQuantity)
//             throw new Error(`Row ${i + 1} Batch ${b.batchCode}: Insufficient batch stock.`);
//         }
//       }
//     }

//     const now = new Date();
//     const fyStart = now.getMonth() + 1 < 4 ? now.getFullYear() - 1 : now.getFullYear();
//     const fyEnd = fyStart + 1;
//     const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
//     const key = "PurchaseDebitNote";
//     let counter = await Counter.findOne({ id: key, companyId }).session(session);
//     if (!counter) [counter] = await Counter.create([{ id: key, companyId, seq: 1 }], { session });
//     else {
//       counter.seq += 1;
//       await counter.save({ session });
//     }
//     const paddedSeq = String(counter.seq).padStart(5, "0");
//     debitNoteData.documentNumberDebitNote = `PURCH-DEBIT/${financialYear}/${paddedSeq}`;

//     const [debitNote] = await DebitNote.create([debitNoteData], { session });

//     for (const item of debitNoteData.items) {
//       const inventory = await Inventory.findOne({ item: item.item, warehouse: item.warehouse, companyId }).session(session);
//       inventory.quantity -= item.quantity;
//       if (item.managedBy?.toLowerCase() === "batch") {
//         for (const b of item.batches) {
//           const idx = inventory.batches.findIndex(batch => batch.batchNumber === b.batchCode);
//           inventory.batches[idx].quantity -= b.allocatedQuantity;
//           if (inventory.batches[idx].quantity <= 0) inventory.batches.splice(idx, 1);
//         }
//       }
//       await inventory.save({ session });
//     }

//     for (const item of debitNoteData.items) {
//       await StockMovement.create([
//         {
//           item: item.item,
//           warehouse: item.warehouse,
//           movementType: "OUT",
//           quantity: item.quantity,
//           reference: debitNote._id,
//           referenceType: "DebitNote",
//           remarks: `Stock decreased via Debit Note for item ${item.itemName}.`,
//           companyId,
//           createdBy: decoded.id,
//           batchDetails: item.managedBy?.toLowerCase() === "batch" ? item.batches.map(b => ({ batchNumber: b.batchCode, quantity: b.allocatedQuantity })) : [],
//         },
//       ], { session });
//     }

//     await session.commitTransaction();
//     session.endSession();
//     return NextResponse.json({ success: true, message: "Debit Note created.", debitNoteId: debitNote._id, debitNote }, { status: 201 });

//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("Debit Note error:", error);
//     return NextResponse.json({ success: false, message: error.message || "Unexpected error." }, { status: 500 });
//   }
// }



// GET - Fetch all Debit Notes
// export async function GET(req) {
//   await dbConnect();
//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) throw new Error("Unauthorized: No token provided");
//     const decoded = verifyJWT(token);
//     // Ensure companyId is present in decoded token for filtering
//     if (!decoded || !decoded.companyId) {
//       console.error("Authentication Error (DebitNote GET): Decoded JWT is missing 'companyId' claim.", { decoded });
//       throw new Error("Unauthorized: Invalid token (missing companyId).");
//     }

//     // Filter by companyId
//     const debitNotes = await DebitNote.find({ companyId: decoded.companyId })
//       .populate("supplier")
//       .sort({ createdAt: -1 });

//     return NextResponse.json({ success: true, data: debitNotes }, { status: 200 });
//   } catch (error) {
//     console.error("Error fetching all Debit Notes:", error);
//     return NextResponse.json({ success: false, message: error.message }, { status: 500 });
//   }
// }