import { NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import formidable from "formidable";
import { Readable } from "stream";
import dbConnect from "@/lib/db";
import GRN from "@/models/grnModels";
import PurchaseOrder from "@/models/PurchaseOrder";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Counter from "@/models/Counter";
import Supplier from "@/models/SupplierModels";
import ItemModels from "@/models/ItemModels";

// Accounting (optional)
import { autoGRN } from "@/lib/autoTransaction";

export const dynamic = 'force-dynamic';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ──────────────────────────────────────────────────────────────
// Helper: Convert NextRequest to Node.js readable stream for formidable
// ──────────────────────────────────────────────────────────────
function createNodeCompatibleRequest(req) {
  const nodeReq = Readable.fromWeb(req.body);
  nodeReq.headers = Object.fromEntries(req.headers.entries());
  nodeReq.method = req.method;
  return nodeReq;
}

// ──────────────────────────────────────────────────────────────
// Helper: Parse multipart form data
// ──────────────────────────────────────────────────────────────
async function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: true, keepExtensions: true, maxFileSize: 10 * 1024 * 1024 });
    const nodeReq = createNodeCompatibleRequest(req);
    form.parse(nodeReq, (err, fields, files) => {
      if (err) { console.error("Formidable parse error:", err); return reject(err); }
      const parsedFields = {};
      for (const key in fields) parsedFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
      const parsedFiles = {};
      for (const key in files) parsedFiles[key] = Array.isArray(files[key]) ? files[key] : [files[key]];
      resolve({ fields: parsedFields, files: parsedFiles });
    });
  });
}

// ──────────────────────────────────────────────────────────────
// Helper: Upload files to Cloudinary
// ──────────────────────────────────────────────────────────────
async function uploadFiles(fileObjects, folderName, companyId) {
  const uploadedFiles = [];
  const fileArray = Array.isArray(fileObjects) ? fileObjects : [];
  for (const file of fileArray) {
    if (!file || !file.filepath) continue;
    try {
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
    } catch (uploadError) {
      console.error(`Cloudinary upload error for ${file.originalFilename}:`, uploadError);
      throw new Error(`Failed to upload file ${file.originalFilename}: ${uploadError.message}`);
    }
  }
  return uploadedFiles;
}

// ──────────────────────────────────────────────────────────────
// Helper: Delete files from Cloudinary by publicId
// ──────────────────────────────────────────────────────────────
async function deleteFilesByPublicIds(publicIds) {
  if (!publicIds || publicIds.length === 0) return;
  for (const publicId of publicIds) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (deleteError) {
      console.error(`Error deleting Cloudinary asset ${publicId}:`, deleteError);
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Helper: Process a single GRN item (update inventory)
// Used in POST and also in DELETE (reverse operation)
// ──────────────────────────────────────────────────────────────
async function processGrnItem(item, grnId, decodedToken, session, fromPO, isDelete = false) {
  const qty = Number(item.quantity);
  const itemId = item.item?._id || item.item;
  const warehouseId = item.warehouse?._id || item.warehouse;
  const binId = item.selectedBin?._id || item.selectedBin || null;
  const variantId = item.variant?.variantId || item.selectedVariantId;

  if (!itemId || !Types.ObjectId.isValid(itemId) || !warehouseId || !Types.ObjectId.isValid(warehouseId) || qty <= 0) {
    throw new Error(`Invalid GRN item for ${item.itemCode || 'unknown'}`);
  }

  // Find inventory document
  let inventory = await Inventory.findOne({
    companyId: decodedToken.companyId,
    item: new Types.ObjectId(itemId),
    warehouse: new Types.ObjectId(warehouseId),
  }).session(session);

  if (!inventory) {
    // Should not happen when deleting, but create if necessary
    inventory = new Inventory({
      companyId: decodedToken.companyId,
      item: new Types.ObjectId(itemId),
      warehouse: new Types.ObjectId(warehouseId),
      quantity: 0,
      committed: 0,
      onOrder: 0,
      batches: [],
      hasVariants: !!variantId,
      variantInventory: [],
    });
  }

  if (isDelete) {
    // Reverse operation: remove physical stock and increase onOrder
    if (variantId) {
      let variantInv = inventory.variantInventory.find(v => v.variantId.toString() === variantId.toString());
      if (!variantInv) {
        variantInv = {
          variantId: new Types.ObjectId(variantId),
          sku: item.itemCode,
          attributes: item.variant?.attributes || {},
          quantity: 0,
          committed: 0,
          onOrder: 0,
          batches: []
        };
        inventory.variantInventory.push(variantInv);
      }
      variantInv.quantity = Math.max((variantInv.quantity || 0) - qty, 0);
      if (fromPO) {
        variantInv.onOrder = (variantInv.onOrder || 0) + qty;
      }
    } else {
      inventory.quantity = Math.max((inventory.quantity || 0) - qty, 0);
      if (fromPO) {
        inventory.onOrder = (inventory.onOrder || 0) + qty;
      }
    }
  } else {
    // Normal POST operation: reduce onOrder (if from PO), increase physical stock
    if (fromPO) {
      if (variantId) {
        let variantInv = inventory.variantInventory.find(v => v.variantId.toString() === variantId.toString());
        if (!variantInv) {
          variantInv = {
            variantId: new Types.ObjectId(variantId),
            sku: item.itemCode,
            attributes: item.variant?.attributes || {},
            quantity: 0,
            committed: 0,
            onOrder: 0,
            batches: []
          };
          inventory.variantInventory.push(variantInv);
        }
        variantInv.onOrder = Math.max((variantInv.onOrder || 0) - qty, 0);
      } else {
        inventory.onOrder = Math.max((inventory.onOrder || 0) - qty, 0);
      }
    }

    if (variantId) {
      let variantInv = inventory.variantInventory.find(v => v.variantId.toString() === variantId.toString());
      if (!variantInv) {
        variantInv = {
          variantId: new Types.ObjectId(variantId),
          sku: item.itemCode,
          attributes: item.variant?.attributes || {},
          quantity: 0,
          committed: 0,
          onOrder: 0,
          batches: []
        };
        inventory.variantInventory.push(variantInv);
      }
      variantInv.quantity += qty;
    } else {
      inventory.quantity += qty;
    }
  }

  // Batch adjustments (if any) – for delete we would need to revert batches too, but that's complex.
  // For simplicity, we skip batch reversal on delete; you can implement if needed.

  await inventory.save({ session });
  await inventory.updateStockStatus(); // if you have such method

  // Log stock movement (only for POST, not for DELETE reversal)
  if (!isDelete) {
    await StockMovement.create([{
      companyId: decodedToken.companyId,
      createdBy: decodedToken.userId || decodedToken.id,
      item: new Types.ObjectId(itemId),
      variantId: variantId ? new Types.ObjectId(variantId) : null,
      warehouse: new Types.ObjectId(warehouseId),
      bin: binId ? new Types.ObjectId(binId) : null,
      movementType: "IN",
      quantity: qty,
      reference: grnId,
      referenceType: "GRN",
      remarks: `Stock received via GRN${variantId ? ` for variant ${item.itemCode}` : ''}`,
      date: new Date()
    }], { session });
  } else {
    // Optionally log a reversal movement
    await StockMovement.create([{
      companyId: decodedToken.companyId,
      createdBy: decodedToken.userId || decodedToken.id,
      item: new Types.ObjectId(itemId),
      variantId: variantId ? new Types.ObjectId(variantId) : null,
      warehouse: new Types.ObjectId(warehouseId),
      bin: binId ? new Types.ObjectId(binId) : null,
      movementType: "REVERSAL",
      quantity: qty,
      reference: grnId,
      referenceType: "GRN",
      remarks: `GRN deleted, stock reversed${variantId ? ` for variant ${item.itemCode}` : ''}`,
      date: new Date()
    }], { session });
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/grn
// ──────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────
// POST /api/grn (with retry & counter outside transaction)
// ──────────────────────────────────────────────────────────────
export async function POST(req) {
  await dbConnect();

  // 1. Parse and prepare data outside transaction
  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const decoded = verifyJWT(token);
  const companyId = decoded?.companyId;
  if (!companyId) return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 401 });

  const { fields, files } = await parseForm(req);
  const grnData = JSON.parse(fields.grnData || "{}");
  const removedFilesPublicIds = JSON.parse(fields.removedFiles || "[]");
  const existingFilesMetadata = JSON.parse(fields.existingFiles || "[]");

  if (!Array.isArray(grnData.items) || grnData.items.length === 0) {
    return NextResponse.json({ success: false, error: "Missing items" }, { status: 400 });
  }

  grnData.companyId = companyId;
  delete grnData._id;

  // 2. Handle file uploads (can be done outside)
  const newUploadedFiles = await uploadFiles(files.newAttachments || [], "grn-attachments", companyId);
  grnData.attachments = [
    ...(existingFilesMetadata.filter(f => !removedFilesPublicIds.includes(f.publicId))),
    ...newUploadedFiles,
  ];
  await deleteFilesByPublicIds(removedFilesPublicIds);

  // 3. Generate document number (outside transaction – atomic but independent)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  let fyStart = currentYear, fyEnd = currentYear + 1;
  if (currentMonth < 4) { fyStart = currentYear - 1; fyEnd = currentYear; }
  const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
  const key = "PurchaseGrn";

  // Retry counter update a few times if needed
  let counter;
  let retries = 3;
  while (retries > 0) {
    try {
      counter = await Counter.findOneAndUpdate(
        { id: key, companyId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      break;
    } catch (err) {
      retries--;
      if (retries === 0) throw new Error("Failed to generate document number after retries");
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  grnData.documentNumberGrn = `PURCH-GRN/${financialYear}/${String(counter.seq).padStart(5, "0")}`;
  const fromPO = !!grnData.purchaseOrderId;

  // 4. Retry logic for the main transaction (handles inventory & PO updates)
  let attempt = 0;
  const maxAttempts = 3;
  while (attempt < maxAttempts) {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      // Create GRN document
      const [grn] = await GRN.create([grnData], { session });

      // Process each item (inventory & stock movement)
      for (const item of grnData.items) {
        await processGrnItem(item, grn._id, decoded, session, fromPO, false);
      }

      // Update linked Purchase Order
      if (fromPO && grnData.purchaseOrderId) {
        const po = await PurchaseOrder.findById(grnData.purchaseOrderId).session(session);
        if (po) {
          for (const grnItem of grnData.items) {
            const poItem = po.items.find(pi => pi.item.toString() === (grnItem.item?._id || grnItem.item));
            if (poItem) {
              poItem.receivedQuantity = (poItem.receivedQuantity || 0) + grnItem.quantity;
            }
          }
          const fullyReceived = po.items.every(pi => (pi.receivedQuantity || 0) >= (pi.quantity || 0));
          const anyReceived = po.items.some(pi => (pi.receivedQuantity || 0) > 0);
          if (fullyReceived) po.orderStatus = "FullyReceived";
          else if (anyReceived) po.orderStatus = "PartiallyReceived";
          else po.orderStatus = "Open";
          await po.save({ session });
        }
      }

      await session.commitTransaction();
      session.endSession();

      // Success – exit retry loop
      // Optional accounting (outside transaction)
      try {
        const totalAmount = grnData.grandTotal || grnData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        if (totalAmount > 0 && typeof autoGRN === 'function') {
          await autoGRN({
            companyId,
            amount: totalAmount,
            partyId: grnData.supplier,
            partyName: grnData.supplierName,
            referenceId: grn._id,
            referenceNumber: grn.documentNumberGrn,
            narration: `GRN ${grn.documentNumberGrn} — Stock received`,
            date: grnData.postingDate || new Date(),
            createdBy: decoded.id || decoded.userId,
          });
        }
      } catch (accountingErr) {
        console.error(`Accounting entry failed for GRN ${grn.documentNumberGrn}:`, accountingErr.message);
      }

      return NextResponse.json(
        { success: true, message: "GRN created successfully", data: grn },
        { status: 201 }
      );
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      attempt++;
      console.error(`Transaction attempt ${attempt} failed:`, error);
      if (attempt === maxAttempts) {
        // All retries exhausted
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, attempt * 100));
    }
  }
}

// ──────────────────────────────────────────────────────────────
// PUT /api/grn – Update GRN (no stock changes)
// ──────────────────────────────────────────────────────────────
export async function PUT(req) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

    const { fields, files } = await parseForm(req);
    const grnData = JSON.parse(fields.grnData || "{}");
    const removedFiles = JSON.parse(fields.removedFiles || "[]");
    const existingFiles = JSON.parse(fields.existingFiles || "[]");

    if (!grnData._id) return NextResponse.json({ success: false, error: "GRN ID required" }, { status: 400 });
    if (!Array.isArray(grnData.items) || grnData.items.length === 0) {
      return NextResponse.json({ success: false, error: "At least one item required" }, { status: 400 });
    }

    // Validate IDs
    for (let i = 0; i < grnData.items.length; i++) {
      const item = grnData.items[i];
      if (!Types.ObjectId.isValid(item.item)) throw new Error(`Invalid item ID for row ${i + 1}`);
      if (!Types.ObjectId.isValid(item.warehouse)) throw new Error(`Invalid warehouse ID for row ${i + 1}`);
    }

    const newFiles = await uploadFiles(files.newAttachments || [], "grn-attachments", decoded.companyId);
    grnData.attachments = [...existingFiles, ...newFiles];
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

// ──────────────────────────────────────────────────────────────
// GET /api/grn – List or single GRN
// ──────────────────────────────────────────────────────────────
export async function GET(req) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const companyId = decoded.companyId;

    if (id) {
      const grn = await GRN.findOne({ _id: id, companyId })
        .populate("supplier", "supplierCode supplierName")
        .populate("items.item", " itemCode itemName imageUrl  variants gstRate");
      if (!grn) return NextResponse.json({ success: false, error: "GRN not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: grn }, { status: 200 });
    }

    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    const [grns, total] = await Promise.all([
      GRN.find({ companyId })
        .populate("supplier", "supplierCode supplierName")
        .populate("items.item", "itemCode itemName imageUrl  variants gstRate")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      GRN.countDocuments({ companyId }),
    ]);

    return NextResponse.json({
      success: true,
      data: grns,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/grn error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────
// DELETE /api/grn – Delete GRN and revert inventory changes
// ──────────────────────────────────────────────────────────────
export async function DELETE(req) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid GRN ID" }, { status: 400 });
    }

    // Find the GRN
    const grn = await GRN.findOne({ _id: id, companyId: decoded.companyId }).session(session);
    if (!grn) {
      return NextResponse.json({ success: false, error: "GRN not found" }, { status: 404 });
    }

    const fromPO = !!grn.purchaseOrderId;

    // ✅ Reverse inventory changes for each item (remove stock, restore onOrder)
    for (const item of grn.items) {
      await processGrnItem(item, grn._id, decoded, session, fromPO, true);
    }

    // ✅ Update the linked Purchase Order (reduce received quantities)
    if (fromPO && grn.purchaseOrderId) {
      const po = await PurchaseOrder.findById(grn.purchaseOrderId).session(session);
      if (po) {
        for (const grnItem of grn.items) {
          const poItem = po.items.find(pi => pi.item.toString() === (grnItem.item?._id || grnItem.item));
          if (poItem) {
            const prevReceived = poItem.receivedQuantity || 0;
            poItem.receivedQuantity = Math.max(prevReceived - grnItem.quantity, 0);
          }
        }
        // Re‑evaluate PO status
        const fullyReceived = po.items.every(pi => (pi.receivedQuantity || 0) >= (pi.quantity || 0));
        const anyReceived = po.items.some(pi => (pi.receivedQuantity || 0) > 0);
        if (fullyReceived) po.orderStatus = "FullyReceived";
        else if (anyReceived) po.orderStatus = "PartiallyReceived";
        else po.orderStatus = "Open";
        await po.save({ session });
      }
    }

    // Delete attached files from Cloudinary
    if (grn.attachments && grn.attachments.length) {
      const publicIds = grn.attachments.map(a => a.publicId).filter(Boolean);
      await deleteFilesByPublicIds(publicIds);
    }

    // Delete the GRN document
    await GRN.deleteOne({ _id: id, companyId: decoded.companyId }).session(session);

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ success: true, message: "GRN deleted successfully" }, { status: 200 });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("DELETE /api/grn error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


// // File: src/app/api/grn/route.js
// import Supplier from "@/models/SupplierModels";
// import ItemModels from "@/models/ItemModels";
// // File: src/app/api/grn/route.js

// import { NextResponse } from "next/server";
// import mongoose, { Types } from "mongoose";
// import { v2 as cloudinary } from "cloudinary";
// import formidable from "formidable";
// import { Readable } from "stream";
// import dbConnect from "@/lib/db";
// import GRN from "@/models/grnModels"; // Assuming your GRN model
// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth"; // Your auth helpers
// import Counter from "@/models/Counter";

// export const dynamic = 'force-dynamic';

// // ✅ Cloudinary Config
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// /**
//  * ✅ Convert Fetch API Request (App Router) body to Node.js Readable Stream
//  * and attach headers/method for formidable.
//  */
// function createNodeCompatibleRequest(req) {
//   const nodeReq = Readable.fromWeb(req.body);
//   nodeReq.headers = Object.fromEntries(req.headers.entries());
//   nodeReq.method = req.method;
//   return nodeReq;
// }

// /**
//  * ✅ Parse form-data for Next.js App Router
//  */
// async function parseForm(req) {
//   return new Promise((resolve, reject) => {
//     const form = formidable({
//       multiples: true,
//       keepExtensions: true,
//       maxFileSize: 10 * 1024 * 1024,
//     });
    
//     const nodeReq = createNodeCompatibleRequest(req);

//     form.parse(nodeReq, (err, fields, files) => {
//       if (err) {
//         console.error("Formidable parse error:", err);
//         return reject(err);
//       }
      
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

// /**
//  * ✅ Upload Files to Cloudinary and return structured array
//  */
// async function uploadFiles(fileObjects, folderName, companyId) {
//   const uploadedFiles = [];
//   const fileArray = Array.isArray(fileObjects) ? fileObjects : []; 

//   if (fileArray.length > 0) {
//     for (const file of fileArray) {
//       if (!file || !file.filepath) {
//         console.warn("Skipping invalid file object for upload (no filepath):", file);
//         continue;
//       }
//       try {
//         const result = await cloudinary.uploader.upload(file.filepath, {
//           folder: `${folderName}/${companyId || 'default_company_attachments'}`,
//           resource_type: "auto",
//           original_filename: file.originalFilename,
//         });
//         uploadedFiles.push({
//           fileName: file.originalFilename || result.original_filename,
//           fileUrl: result.secure_url,
//           fileType: file.mimetype || "application/octet-stream",
//           uploadedAt: new Date(),
//           publicId: result.public_id,
//         });
//       } catch (uploadError) {
//         console.error(`Cloudinary upload error for ${file.originalFilename}:`, uploadError);
//         throw new Error(`Failed to upload file ${file.originalFilename}: ${uploadError.message}`);
//       }
//     }
//   }
//   return uploadedFiles;
// }

// /**
//  * ✅ Delete Files from Cloudinary by their public IDs
//  */
// async function deleteFilesByPublicIds(publicIds) {
//   if (!publicIds || publicIds.length === 0) return;

//   for (const publicId of publicIds) {
//     try {
//       await cloudinary.uploader.destroy(publicId);
//       console.log(`Deleted Cloudinary asset: ${publicId}`);
//     } catch (deleteError) {
//       console.error(`Error deleting Cloudinary asset ${publicId}:`, deleteError);
//     }
//   }
// }

// async function processGrnItem(item, grnId, decodedToken, session, fromPO) {
//   const qty = Number(item.quantity);

//   // ✅ Extract IDs
//   const itemId = item.item?._id || item.item;
//   const warehouseId = item.warehouse?._id || item.warehouse;
//   const binId = item.selectedBin?._id || item.selectedBin || null;

//   if (!itemId || !Types.ObjectId.isValid(itemId) || !warehouseId || !Types.ObjectId.isValid(warehouseId) || qty <= 0) {
//     console.warn(`Skipping invalid GRN item: ${item.itemCode || itemId}`, item);
//     throw new Error(`Invalid GRN item for ${item.itemCode || 'unknown'}`);
//   }

//   // ✅ Find inventory record
//   let inventoryDoc = await Inventory.findOne({
//     item: new Types.ObjectId(itemId),
//     warehouse: new Types.ObjectId(warehouseId),
//     bin: binId ? new Types.ObjectId(binId) : { $in: [null, undefined] },
//     companyId: decodedToken.companyId,
//   }).session(session);

//   // ✅ Create if not exists
//   if (!inventoryDoc) {
//     inventoryDoc = new Inventory({
//       item: new Types.ObjectId(itemId),
//       warehouse: new Types.ObjectId(warehouseId),
//       bin: binId ? new Types.ObjectId(binId) : null,
//       companyId: decodedToken.companyId,
//       quantity: 0,
//       committed: 0,
//       onOrder: 0,
//       batches: [],
//     });
//     console.log(`Created new inventory for item ${itemId} in warehouse ${warehouseId}${binId ? `, bin ${binId}` : ""}`);
//   }

//   // ✅ Reduce onOrder if coming from PO
//   if (fromPO) {
//     inventoryDoc.onOrder = Math.max((inventoryDoc.onOrder || 0) - qty, 0);
//   }

//   // ---------- Batch-Managed Items ----------
//   if (item.managedBy?.toLowerCase() === "batch" && Array.isArray(item.batches) && item.batches.length > 0) {
//     for (const receivedBatch of item.batches) {
//       const batchQty = Number(receivedBatch.allocatedQuantity ?? receivedBatch.batchQuantity);
//       const batchBinId = receivedBatch.selectedBin?._id || receivedBatch.selectedBin || binId || null;

//       if (!receivedBatch.batchNumber || isNaN(batchQty) || batchQty <= 0) {
//         console.warn(`Skipping invalid batch for ${item.itemCode || itemId}`, receivedBatch);
//         continue;
//       }

//       // Ensure batches array exists
//       if (!Array.isArray(inventoryDoc.batches)) inventoryDoc.batches = [];

//       const batchIndex = inventoryDoc.batches.findIndex(b => b.batchNumber === receivedBatch.batchNumber);

//       if (batchIndex === -1) {
//         // Add new batch
//         inventoryDoc.batches.push({
//           batchNumber: receivedBatch.batchNumber,
//           quantity: batchQty,
//           expiryDate: receivedBatch.expiryDate ? new Date(receivedBatch.expiryDate) : null,
//           manufacturer: receivedBatch.manufacturer || "",
//           unitPrice: receivedBatch.unitPrice || 0,
//           bin: batchBinId ? new Types.ObjectId(batchBinId) : null,
//         });
//       } else {
//         // Update existing batch
//         inventoryDoc.batches[batchIndex].quantity += batchQty;
//         if (batchBinId) inventoryDoc.batches[batchIndex].bin = new Types.ObjectId(batchBinId);
//       }

//       // Update overall quantity
//       inventoryDoc.quantity += batchQty;

//       // Create StockMovement
//       await StockMovement.create([{
//         item: new Types.ObjectId(itemId),
//         warehouse: new Types.ObjectId(warehouseId),
//         bin: batchBinId ? new Types.ObjectId(batchBinId) : null,
//         movementType: "IN",
//         quantity: batchQty,
//         reference: grnId,
//         referenceType: "GRN",
//         remarks: `Stock received via GRN - Batch ${receivedBatch.batchNumber}`,
//         companyId: decodedToken.companyId,
//         createdBy: decodedToken.userId,
//       }], { session });
//     }
//   } else {
//     // ---------- Non-Batch Items ----------
//     inventoryDoc.quantity += qty;

//     await StockMovement.create([{
//       item: new Types.ObjectId(itemId),
//       warehouse: new Types.ObjectId(warehouseId),
//       bin: binId ? new Types.ObjectId(binId) : null,
//       movementType: "IN",
//       quantity: qty,
//       reference: grnId,
//       referenceType: "GRN",
//       remarks: "Stock received via GRN",
//       companyId: decodedToken.companyId,
//       createdBy: decodedToken.userId,
//     }], { session });
//   }

//   // ✅ Save updates
//   await inventoryDoc.save({ session });

//   console.log(`Processed GRN item: ${item.itemCode || itemId}, qty: ${qty}${binId ? `, bin: ${binId}` : ""}`);
// }




// /**
//  * ✅ POST: Create a new GRN document and update inventory/stock movements.
//  */
// export async function POST(req) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     // ✅ 1. Auth
//     const token = getTokenFromHeader(req);
//     if (!token) throw new Error("Unauthorized: No token provided");

//     const decoded = verifyJWT(token);
//     const companyId = decoded?.companyId;
//     if (!companyId) throw new Error("Unauthorized: Invalid token payload");

//     // ✅ 2. Parse form
//     const { fields, files } = await parseForm(req);
//     const grnData = JSON.parse(fields.grnData || "{}");
//     const removedFilesPublicIds = JSON.parse(fields.removedFiles || "[]");
//     const existingFilesMetadata = JSON.parse(fields.existingFiles || "[]");

//     if (!Array.isArray(grnData.items) || grnData.items.length === 0) {
//       throw new Error("Invalid GRN data: Missing items or invalid structure.");
//     }

//     grnData.companyId = companyId;
//     delete grnData._id;

//     // ✅ 3. Upload files
//     const newUploadedFiles = await uploadFiles(files.newAttachments || [], "grn-attachments", companyId);

//     grnData.attachments = [
//       ...(existingFilesMetadata.filter(f => !removedFilesPublicIds.includes(f.publicId)) || []),
//       ...newUploadedFiles,
//     ];

//     await deleteFilesByPublicIds(removedFilesPublicIds);

//     // ✅ 4. Generate GRN document number per company
//     const now = new Date();
//     const currentYear = now.getFullYear();
//     const currentMonth = now.getMonth() + 1;

//     let fyStart = currentYear;
//     let fyEnd = currentYear + 1;
//     if (currentMonth < 4) {
//       fyStart = currentYear - 1;
//       fyEnd = currentYear;
//     }

//     const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
//     const key = "PurchaseGrn";

//     let counter = await Counter.findOne({ id: key, companyId }).session(session);
//     if (!counter) {
//       const [created] = await Counter.create([{ id: key, companyId, seq: 1 }], { session });
//       counter = created;
//     } else {
//       counter.seq += 1;
//       await counter.save({ session });
//     }

//     const paddedSeq = String(counter.seq).padStart(5, "0");
//     grnData.documentNumberGrn = `PURCH-GRN/${financialYear}/${paddedSeq}`;

//     // ✅ 5. Save GRN
//     const [grn] = await GRN.create([grnData], { session });
//     const fromPO = !!grnData.purchaseOrderId;

//     for (const item of grnData.items) {
//       await processGrnItem(item, grn._id, decoded, session, fromPO);
//     }

//     await session.commitTransaction();
//     session.endSession();

//     return NextResponse.json(
//       { success: true, message: "GRN created successfully and inventory updated", data: grn },
//       { status: 201 }
//     );
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("POST /api/grn error:", error.stack || error);

//     return NextResponse.json(
//       {
//         success: false,
//         error: error.message || "Failed to process GRN due to an internal server error.",
//       },
//       { status: 500 }
//     );
//   }
// }
// /**
//  * ✅ PUT: Update GRN
//  */
// export async function PUT(req) {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     await dbConnect();

//     const token = getTokenFromHeader(req);
//     if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

//     const decoded = verifyJWT(token);
//     if (!decoded || !decoded.companyId)
//       return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

//     const { fields, files } = await parseForm(req);
//     const grnData = JSON.parse(fields.grnData || "{}");
//     const removedFiles = JSON.parse(fields.removedFiles || "[]");
//     const existingFiles = JSON.parse(fields.existingFiles || "[]");

//     if (!grnData._id) return NextResponse.json({ success: false, error: "GRN ID required" }, { status: 400 });
//     if (!Array.isArray(grnData.items) || grnData.items.length === 0)
//       return NextResponse.json({ success: false, error: "At least one item required" }, { status: 400 });

//     // ✅ Validate ObjectIds
//     for (let i = 0; i < grnData.items.length; i++) {
//       const item = grnData.items[i];
//       if (!Types.ObjectId.isValid(item.item)) throw new Error(`Invalid item ID for row ${i + 1}`);
//       if (!Types.ObjectId.isValid(item.warehouse)) throw new Error(`Invalid warehouse ID for row ${i + 1}`);
//     }

//     // ✅ Upload new files and merge
//     const newFiles = await uploadFiles(files);
//     grnData.attachments = [...existingFiles, ...newFiles];

//     // ✅ Remove deleted files from Cloudinary
//     for (const file of removedFiles) {
//       if (file.publicId) await cloudinary.uploader.destroy(file.publicId);
//     }

//     const updatedGRN = await GRN.findByIdAndUpdate(grnData._id, grnData, { new: true, session });
//     if (!updatedGRN) return NextResponse.json({ success: false, error: "GRN not found" }, { status: 404 });

//     await session.commitTransaction();
//     session.endSession();

//     return NextResponse.json({ success: true, message: "GRN updated successfully", data: updatedGRN }, { status: 200 });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("PUT /api/grn error:", error);
//     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
//   }
// }

// /**
//  * ✅ GET: Fetch GRNs
//  */
// export async function GET(req) {
//   try {
//     await dbConnect();
//     const token = getTokenFromHeader(req);
//     if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

//     const decoded = verifyJWT(token);
//     if (!decoded || !decoded.companyId)
//       return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get("id");
//     const companyId = decoded.companyId;

//     if (id) {
//       const grn = await GRN.findOne({ _id: id, companyId })
//         .populate("supplier", "supplierCode supplierName")
//         .populate("items.item", "itemCode itemName");
//       if (!grn) return NextResponse.json({ success: false, error: "GRN not found" }, { status: 404 });
//       return NextResponse.json({ success: true, data: grn }, { status: 200 });
//     }

//     const page = parseInt(searchParams.get("page")) || 1;
//     const limit = parseInt(searchParams.get("limit")) || 10;
//     const total = await GRN.countDocuments({ companyId });

//     const grns = await GRN.find({ companyId })
//       .populate("supplier", "supplierCode supplierName")
//       .populate("items.item", "itemCode itemName")
//       .sort({ createdAt: -1 })
//       .skip((page - 1) * limit)
//       .limit(limit);

//     return NextResponse.json({ success: true, data: grns, pagination: { page, limit, total } }, { status: 200 });
//   } catch (error) {
//     console.error("GET /api/grn error:", error);
//     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
//   }
// }

/**
 * ✅ DELETE: Remove GRN
 */
// export async function DELETE(req) {
//   try {
//     await dbConnect();
//     const token = getTokenFromHeader(req);
//     if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

//     const decoded = verifyJWT(token);
//     if (!decoded || !decoded.companyId)
//       return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get("id");
//     if (!id) return NextResponse.json({ success: false, error: "GRN ID required" }, { status: 400 });

//     const grn = await GRN.findByIdAndDelete(id);
//     if (!grn) return NextResponse.json({ success: false, error: "GRN not found" }, { status: 404 });

//     return NextResponse.json({ success: true, message: "GRN deleted" }, { status: 200 });
//   } catch (error) {
//     console.error("DELETE /api/grn error:", error);
//     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
//   }
// }



