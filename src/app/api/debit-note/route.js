import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import formidable from "formidable";
import { Readable } from "stream";
import dbConnect from "@/lib/db";
import DebitNote from "@/models/DebitNoteModel";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import Warehouse from "@/models/warehouseModels"; // Import the Warehouse model
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Counter from "@/models/Counter";

const { Types } = mongoose;

// --- Configuration ---
cloudinary.config({
 cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
 api_key: process.env.CLOUDINARY_API_KEY,
 api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const dynamic = 'force-dynamic';

// --- Helper Functions for File Parsing and Uploading ---
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
 * Pre-validates stock for all items before starting the database transaction.
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

        const inventoryDoc = await Inventory.findOne(query).lean();
        const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;

        if (!inventoryDoc) throw new Error(`Stock Check Failed: No inventory for '${item.itemName}' in ${location}.`);
        if (inventoryDoc.quantity < item.quantity) {
            throw new Error(`Stock Check Failed: Insufficient stock for '${item.itemName}' in ${location}. Required: ${item.quantity}, Available: ${inventoryDoc.quantity}.`);
        }
    }
}

/**
 * Processes a single item's stock deduction within a database transaction.
 */
async function processItemForDebitNote(item, session, debitNote, decoded) {
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

    const inventoryDoc = await Inventory.findOne(query).session(session);
    if (!inventoryDoc) {
        const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;
        throw new Error(`Transaction failed: Inventory record for '${item.itemName}' in ${location} disappeared.`);
    }

    if (inventoryDoc.quantity < item.quantity) {
        const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;
        throw new Error(`Transaction failed due to insufficient stock for '${item.itemName}' in ${location}.`);
    }

    inventoryDoc.quantity -= item.quantity;
    
    await StockMovement.create([{
        item: item.item,
        warehouse: item.warehouse,
        bin: binId,
        movementType: "OUT",
        quantity: item.quantity,
        reference: debitNote._id,
        referenceType: 'DebitNote',
        documentNumber: debitNote.documentNumberDebitNote,
        remarks: `Stock out via Debit Note: ${debitNote.documentNumberDebitNote}`,
        companyId: decoded.companyId,
        createdBy: decoded.id,
    }], { session });

    await inventoryDoc.save({ session });
}

/* ------------------------------------------- */
/* ---------- API HANDLER (POST) ---------- */
/* ------------------------------------------- */
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
        if (!fields.debitNoteData) throw new Error("Missing debitNoteData payload.");

        const debitNoteData = JSON.parse(fields.debitNoteData);
        if (!Array.isArray(debitNoteData.items) || debitNoteData.items.length === 0) throw new Error("Debit Note must contain items.");

        // ✅ 1. PRE-VALIDATION: Check stock availability BEFORE starting the transaction.
        await validateStockAvailability(debitNoteData.items, companyId);
        
        // ✅ 2. START TRANSACTION: If stock is available, begin the database transaction.
        session.startTransaction();

        debitNoteData.companyId = companyId;
        delete debitNoteData._id;
        debitNoteData.createdBy = decoded.id;

        const newUploadedFiles = await uploadFiles(files.newAttachments || [], 'debit-notes', companyId);
        let existingAttachments = [];
        try { existingAttachments = JSON.parse(fields.existingFiles || '[]'); } catch {}
        debitNoteData.attachments = [...existingAttachments, ...newUploadedFiles];

        const now = new Date();
        const fyStart = now.getMonth() + 1 < 4 ? now.getFullYear() - 1 : now.getFullYear();
        const fyEnd = fyStart + 1;
        const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
        const key = "PurchaseDebitNote";
        let counter = await Counter.findOne({ id: key, companyId }).session(session);
        if (!counter) [counter] = await Counter.create([{ id: key, companyId, seq: 1 }], { session });
        else {
            counter.seq += 1;
            await counter.save({ session });
        }
        const paddedSeq = String(counter.seq).padStart(5, "0");
        debitNoteData.documentNumberDebitNote = `PURCH-DEBIT/${financialYear}/${paddedSeq}`;

        const [debitNote] = await DebitNote.create([debitNoteData], { session });

        // ✅ 3. PROCESS ITEMS: Deduct stock from the correct bins.
        for (const item of debitNoteData.items) {
            await processItemForDebitNote(item, session, debitNote, decoded);
        }

        // ✅ 4. COMMIT: If all steps succeed, commit the transaction.
        await session.commitTransaction();
        session.endSession();
        return NextResponse.json({ success: true, message: "Debit Note created successfully.", debitNoteId: debitNote._id }, { status: 201 });

    } catch (error) {
        // ✅ 5. ABORT: If any error occurs, abort the transaction.
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        session.endSession();
        console.error("Debit Note creation error:", error);
        return NextResponse.json({ success: false, message: error.message || "Unexpected error." }, { status: 500 });
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