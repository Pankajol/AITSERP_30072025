import { NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import formidable from "formidable";
import { Readable } from "stream";
import GRN from "@/models/grnModels";
import dbConnect from "@/lib/db";
import Supplier from "@/models/SupplierModels";
import PurchaseInvoice from "@/models/InvoiceModel";
import PurchaseOrder from "@/models/PurchaseOrder";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Counter from "@/models/Counter";

// ✅ ADD: Auto accounting entry
import { autoPurchaseInvoice } from "@/lib/autoTransaction";

export const dynamic = 'force-dynamic';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
      folder: `${folderName}/${companyId || "default_company"}`,
      resource_type: "auto",
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

async function processInvoiceItem(item, invoiceId, decoded, session, linkedToPO = false) {
  const qty = Number(item.quantity);
  const itemId = item.item?._id || item.item;
  const warehouseId = item.warehouse;
  const binId = item.selectedBin?._id || null;

  if (!itemId || qty <= 0)
    throw new Error(`Invalid item data for ${item.itemCode || 'unknown item'}`);

  let inventoryDoc = await Inventory.findOne({
    item: new Types.ObjectId(itemId),
    warehouse: new Types.ObjectId(warehouseId),
    bin: binId ? new Types.ObjectId(binId) : { $in: [null, undefined] },
    companyId: decoded.companyId,
  }).session(session);

  if (!inventoryDoc) {
    inventoryDoc = await Inventory.create([{
      item: new Types.ObjectId(itemId),
      warehouse: new Types.ObjectId(warehouseId),
      bin: binId ? new Types.ObjectId(binId) : null,
      companyId: decoded.companyId,
      quantity: 0, committed: 0, onOrder: 0, batches: [],
    }], { session });
    inventoryDoc = inventoryDoc[0];
  }

  if (linkedToPO)
    inventoryDoc.onOrder = Math.max((inventoryDoc.onOrder || 0) - qty, 0);

  if (item.managedBy?.toLowerCase() === "batch" && Array.isArray(item.batches) && item.batches.length > 0) {
    for (const batch of item.batches) {
      const batchQty = Number(batch.batchQuantity || batch.allocatedQuantity || 0);
      if (!batch.batchNumber || batchQty <= 0) continue;
      if (!Array.isArray(inventoryDoc.batches)) inventoryDoc.batches = [];
      const existingBatch = inventoryDoc.batches.find(b => b.batchNumber === batch.batchNumber);
      if (existingBatch) {
        existingBatch.quantity += batchQty;
        if (binId) existingBatch.bin = new Types.ObjectId(binId);
      } else {
        inventoryDoc.batches.push({
          batchNumber: batch.batchNumber, quantity: batchQty,
          expiryDate: batch.expiryDate ? new Date(batch.expiryDate) : null,
          manufacturer: batch.manufacturer || "", unitPrice: batch.unitPrice || 0,
          bin: binId ? new Types.ObjectId(binId) : null,
        });
      }
      inventoryDoc.quantity += batchQty;
      await StockMovement.create([{
        item: new Types.ObjectId(itemId), warehouse: new Types.ObjectId(warehouseId),
        bin: binId ? new Types.ObjectId(binId) : null, movementType: "IN", quantity: batchQty,
        reference: invoiceId, referenceType: "PurchaseInvoice",
        remarks: linkedToPO ? `Stock received via Purchase Invoice (Linked PO) - Batch ${batch.batchNumber}` : `Stock received via Purchase Invoice - Batch ${batch.batchNumber}`,
        companyId: decoded.companyId, createdBy: decoded.userId,
      }], { session });
    }
  } else {
    inventoryDoc.quantity += qty;
    await StockMovement.create([{
      item: new Types.ObjectId(itemId), warehouse: new Types.ObjectId(warehouseId),
      bin: binId ? new Types.ObjectId(binId) : null, movementType: "IN", quantity: qty,
      reference: invoiceId, referenceType: "PurchaseInvoice",
      remarks: linkedToPO ? "Stock received via Purchase Invoice (Linked PO)" : "Stock received via Purchase Invoice",
      companyId: decoded.companyId, createdBy: decoded.userId,
    }], { session });
  }
  await inventoryDoc.save({ session });
}

// ─── POST ─────────────────────────────────────────────────────
export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized");
    const decoded = verifyJWT(token);
    const companyId = decoded?.companyId;
    if (!decoded?.companyId) throw new Error("Invalid token payload");

    const { fields, files } = await parseForm(req);
    const invoiceData = JSON.parse(fields.invoiceData || "{}");
    const removedFilesPublicIds = JSON.parse(fields.removedFiles || "[]");
    const existingFilesMetadata = JSON.parse(fields.existingFiles || "[]");

    invoiceData.companyId = decoded.companyId;
    delete invoiceData._id;

    const newUploadedFiles = await uploadFiles(files.newAttachments || [], "purchase-invoices", decoded.companyId);
    invoiceData.attachments = [
      ...(Array.isArray(existingFilesMetadata) ? existingFilesMetadata.filter(f => !removedFilesPublicIds.includes(f.publicId)) : []),
      ...newUploadedFiles,
    ];

    await deleteFilesByPublicIds(removedFilesPublicIds);

    if (!invoiceData.items || !Array.isArray(invoiceData.items) || invoiceData.items.length === 0)
      throw new Error("Invoice must contain at least one item");

    const grandTotal  = Number(invoiceData.grandTotal)  || 0;
    const paidAmount  = Number(invoiceData.paidAmount)  || 0;
    invoiceData.remainingAmount = Math.max(grandTotal - paidAmount, 0);

    const now          = new Date();
    const currentYear  = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    let fyStart = currentYear, fyEnd = currentYear + 1;
    if (currentMonth < 4) { fyStart = currentYear - 1; fyEnd = currentYear; }
    const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
    const key = "PurchaseInvoice";

    let counter = await Counter.findOne({ id: key, companyId }).session(session);
    if (!counter) {
      const [created] = await Counter.create([{ id: key, companyId, seq: 1 }], { session });
      counter = created;
    } else {
      counter.seq += 1;
      await counter.save({ session });
    }

    const paddedSeq = String(counter.seq).padStart(5, "0");
    invoiceData.documentNumberPurchaseInvoice = `PURCH-INV/${financialYear}/${paddedSeq}`;

    const [invoice] = await PurchaseInvoice.create([invoiceData], { session });

    const linkedToPO = !!invoiceData.purchaseOrderId;

    if (invoiceData.invoiceType?.trim().toLowerCase() === "grncopy") {
      const grnDoc = await GRN.findById(invoiceData.grn).session(session);
      if (grnDoc) {
        grnDoc.status  = "Close";
        grnDoc.invoiceId = invoice._id;
        await grnDoc.save({ session });
        console.log(`✅ GRN ${grnDoc._id} marked as Invoiced`);
      } else {
        console.warn(`⚠️ GRN not found for ID: ${invoiceData.grn}`);
      }
    } else {
      for (const item of invoiceData.items) {
        await processInvoiceItem(item, invoice._id, decoded, session, linkedToPO);
      }
    }

    if (invoiceData.purchaseOrderId) {
      const po = await PurchaseOrder.findById(invoiceData.purchaseOrderId).session(session);
      if (po) {
        let allItemsInvoiced = true;
        for (const poItem of po.items) {
          const invItem = invoiceData.items.find(i => i.item.toString() === poItem.item.toString());
          if (invItem) poItem.receivedQuantity = (poItem.receivedQuantity || 0) + Number(invItem.quantity);
          const remaining = Math.max(Number(poItem.orderedQuantity) - poItem.receivedQuantity, 0);
          poItem.quantity = remaining;
          if (remaining > 0) allItemsInvoiced = false;
        }
        po.orderStatus = allItemsInvoiced ? "Close" : "Open";
        po.stockStatus = allItemsInvoiced ? "Updated" : "Adjusted";
        await po.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    // ✅ AUTO ACCOUNTING ENTRY — commitTransaction ke BAAD
    // Purchase Invoice → Purchase Dr (Expense ↑), Accounts Payable Cr (Liability ↑)
    try {
      await autoPurchaseInvoice({
        companyId:       decoded.companyId,
        amount:          grandTotal,                              // ✅ grandTotal use kiya — tumhara field
        partyId:         invoiceData.supplier || invoiceData.supplierId || null,
        partyName:       invoiceData.supplierName || invoiceData.supplier?.name || "Supplier",
        referenceId:     invoice._id,
        referenceNumber: invoice.documentNumberPurchaseInvoice,  // ✅ tumhara invoice number field
        narration:       `Purchase Invoice ${invoice.documentNumberPurchaseInvoice}`,
        date:            invoiceData.postingDate,
        createdBy:       decoded.id || decoded.userId,
      });
    } catch (accountingErr) {
      // ✅ Accounting fail hone se invoice fail NAHI hoga
      // Invoice aur stock already commit ho chuka hai
      console.error(
        `⚠️ Accounting entry failed for purchase invoice ${invoice.documentNumberPurchaseInvoice}:`,
        accountingErr.message
      );
    }

    return NextResponse.json(
      { success: true, message: "Invoice created and stock updated successfully", data: invoice },
      { status: 201 }
    );

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("POST /api/purchase-invoice error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ─── GET ──────────────────────────────────────────────────────
export async function GET(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token)
      return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });

    const user = verifyJWT(token);
    if (!user)
      return new Response(JSON.stringify({ message: "Invalid token" }), { status: 403 });

    const { searchParams } = new URL(req.url);
    const supplierCode = searchParams.get("supplierCode");

    const query = { companyId: user.companyId };
    if (supplierCode) query.supplierCode = supplierCode;

    const invoices = await PurchaseInvoice.find(query).sort({ createdAt: -1 });

    return new Response(JSON.stringify({ success: true, data: invoices }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: "Server error", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}




// import { NextResponse } from "next/server";
// import mongoose, { Types } from "mongoose";
// import { v2 as cloudinary } from "cloudinary";
// import formidable from "formidable";
// import { Readable } from "stream";
// import GRN from "@/models/grnModels";
// import dbConnect from "@/lib/db";
// import Supplier from "@/models/SupplierModels";
// import PurchaseInvoice from "@/models/InvoiceModel";
// import PurchaseOrder from "@/models/PurchaseOrder";
// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import Counter from "@/models/Counter";


// export const dynamic = 'force-dynamic';

// // ✅ Cloudinary Config
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// /** ✅ Convert Fetch Request for formidable */
// function createNodeCompatibleRequest(req) {
//   const nodeReq = Readable.fromWeb(req.body);
//   nodeReq.headers = Object.fromEntries(req.headers.entries());
//   nodeReq.method = req.method;
//   return nodeReq;
// }

// /** ✅ Parse form-data */
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

// /** ✅ Upload files to Cloudinary */
// async function uploadFiles(fileObjects, folderName, companyId) {
//   const uploadedFiles = [];
//   const fileArray = Array.isArray(fileObjects) ? fileObjects : [];
//   for (const file of fileArray) {
//     if (!file || !file.filepath) continue;
//     const result = await cloudinary.uploader.upload(file.filepath, {
//       folder: `${folderName}/${companyId || "default_company"}`,
//       resource_type: "auto",
//     });
//     uploadedFiles.push({
//       fileName: file.originalFilename || result.original_filename,
//       fileUrl: result.secure_url,
//       fileType: file.mimetype || "application/octet-stream",
//       uploadedAt: new Date(),
//       publicId: result.public_id,
//     });
//   }
//   return uploadedFiles;
// }

// /** ✅ Delete Files from Cloudinary */
// async function deleteFilesByPublicIds(publicIds) {
//   if (!publicIds || publicIds.length === 0) return;
//   for (const publicId of publicIds) {
//     try {
//       await cloudinary.uploader.destroy(publicId);
//     } catch (err) {
//       console.error("Cloudinary delete error:", err);
//     }
//   }
// }






//  async function processInvoiceItem(item, invoiceId, decoded, session, linkedToPO = false) {
//   const qty = Number(item.quantity);
//   const itemId = item.item?._id || item.item;
//   const warehouseId = item.warehouse;
//   const binId = item.selectedBin?._id || null;

//   // !warehouseId

//   if (!itemId ||   qty <= 0) {
//     throw new Error(`Invalid item data for ${item.itemCode || 'unknown item'}`);
//   }

//   // ✅ Find or create inventory
//   let inventoryDoc = await Inventory.findOne({
//     item: new Types.ObjectId(itemId),
//     warehouse: new Types.ObjectId(warehouseId),
//     bin: binId ? new Types.ObjectId(binId) : { $in: [null, undefined] },
//     companyId: decoded.companyId,
//   }).session(session);

//   if (!inventoryDoc) {
//     inventoryDoc = await Inventory.create([{
//       item: new Types.ObjectId(itemId),
//       warehouse: new Types.ObjectId(warehouseId),
//       bin: binId ? new Types.ObjectId(binId) : null,
//       companyId: decoded.companyId,
//       quantity: 0,
//       committed: 0,
//       onOrder: 0,
//       batches: [],
//     }], { session });
//     inventoryDoc = inventoryDoc[0];
//   }

//   // ✅ Reduce onOrder if linked to PO
//   if (linkedToPO) {
//     inventoryDoc.onOrder = Math.max((inventoryDoc.onOrder || 0) - qty, 0);
//   }

//   // ✅ Batch-managed items
//   if (item.managedBy?.toLowerCase() === "batch" && Array.isArray(item.batches) && item.batches.length > 0) {
//     for (const batch of item.batches) {
//       const batchQty = Number(batch.batchQuantity || batch.allocatedQuantity || 0);
//       if (!batch.batchNumber || batchQty <= 0) continue;

//       if (!Array.isArray(inventoryDoc.batches)) inventoryDoc.batches = [];
//       const existingBatch = inventoryDoc.batches.find(b => b.batchNumber === batch.batchNumber);

//       if (existingBatch) {
//         existingBatch.quantity += batchQty;
//         if (binId) existingBatch.bin = new Types.ObjectId(binId);
//       } else {
//         inventoryDoc.batches.push({
//           batchNumber: batch.batchNumber,
//           quantity: batchQty,
//           expiryDate: batch.expiryDate ? new Date(batch.expiryDate) : null,
//           manufacturer: batch.manufacturer || "",
//           unitPrice: batch.unitPrice || 0,
//           bin: binId ? new Types.ObjectId(binId) : null,
//         });
//       }

//       inventoryDoc.quantity += batchQty;

//       // ✅ Stock Movement for batch
//       await StockMovement.create([{
//         item: new Types.ObjectId(itemId),
//         warehouse: new Types.ObjectId(warehouseId),
//         bin: binId ? new Types.ObjectId(binId) : null,
//         movementType: "IN",
//         quantity: batchQty,
//         reference: invoiceId,
//         referenceType: "PurchaseInvoice",
//         remarks: linkedToPO ? `Stock received via Purchase Invoice (Linked PO) - Batch ${batch.batchNumber}` : `Stock received via Purchase Invoice - Batch ${batch.batchNumber}`,
//         companyId: decoded.companyId,
//         createdBy: decoded.userId,
//       }], { session });
//     }
//   } else {
//     // ✅ Non-batch items
//     inventoryDoc.quantity += qty;

//     await StockMovement.create([{
//       item: new Types.ObjectId(itemId),
//       warehouse: new Types.ObjectId(warehouseId),
//       bin: binId ? new Types.ObjectId(binId) : null,
//       movementType: "IN",
//       quantity: qty,
//       reference: invoiceId,
//       referenceType: "PurchaseInvoice",
//       remarks: linkedToPO ? "Stock received via Purchase Invoice (Linked PO)" : "Stock received via Purchase Invoice",
//       companyId: decoded.companyId,
//       createdBy: decoded.userId,
//     }], { session });
//   }

//   // ✅ Save inventory changes
//   await inventoryDoc.save({ session });
// }






// /** ✅ POST - Create Purchase Invoice */
// export async function POST(req) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) throw new Error("Unauthorized");
//     const decoded = verifyJWT(token);
//     const companyId = decoded?.companyId;
//     if (!decoded?.companyId) throw new Error("Invalid token payload");

//     const { fields, files } = await parseForm(req);
//     const invoiceData = JSON.parse(fields.invoiceData || "{}");
//     const removedFilesPublicIds = JSON.parse(fields.removedFiles || "[]");
//     const existingFilesMetadata = JSON.parse(fields.existingFiles || "[]");

//     invoiceData.companyId = decoded.companyId;
//     delete invoiceData._id;

//     // ✅ Upload new files
//     const newUploadedFiles = await uploadFiles(files.newAttachments || [], "purchase-invoices", decoded.companyId);
//     invoiceData.attachments = [
//       ...(Array.isArray(existingFilesMetadata) ? existingFilesMetadata.filter(f => !removedFilesPublicIds.includes(f.publicId)) : []),
//       ...newUploadedFiles,
//     ];

//     // ✅ Delete removed files
//     await deleteFilesByPublicIds(removedFilesPublicIds);

//     if (!invoiceData.items || !Array.isArray(invoiceData.items) || invoiceData.items.length === 0) {
//       throw new Error("Invoice must contain at least one item");
//     }



//     const grandTotal = Number(invoiceData.grandTotal) || 0;
// const paidAmount = Number(invoiceData.paidAmount) || 0;

// if (invoiceData.remainingAmount < 0) {
//   invoiceData.remainingAmount = 0;
// }

// // Calculate remaining amount
// invoiceData.remainingAmount = grandTotal - paidAmount;


//     const now = new Date();
//         const currentYear = now.getFullYear();
//         const currentMonth = now.getMonth() + 1;
    
//         let fyStart = currentYear;
//         let fyEnd = currentYear + 1;
//         if (currentMonth < 4) {
//           fyStart = currentYear - 1;
//           fyEnd = currentYear;
//         }
    
//         const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
//         const key = "PurchaseInvoice";
    
//         let counter = await Counter.findOne({ id: key, companyId }).session(session);
//         if (!counter) {
//           const [created] = await Counter.create([{ id: key, companyId, seq: 1 }], { session });
//           counter = created;
//         } else {
//           counter.seq += 1;
//           await counter.save({ session });
//         }
    
//         const paddedSeq = String(counter.seq).padStart(5, "0");
//         invoiceData.documentNumberPurchaseInvoice = `PURCH-INV/${financialYear}/${paddedSeq}`;
    
     
//     // ✅ Save Invoice
//     const [invoice] = await PurchaseInvoice.create([invoiceData], { session });

//     // ✅ Update Inventory for ALL invoices
//     // const linkedToPO = !!invoiceData.purchaseOrderId;
//     // for (const item of invoiceData.items) {
//     //   await processInvoiceItem(item, invoice._id, decoded, session, linkedToPO);
//     // }

//     const linkedToPO = !!invoiceData.purchaseOrderId;

// // ✅ Step: Update GRN or Inventory based on invoiceType
// if ( invoiceData.invoiceType?.trim().toLowerCase() === "grncopy" ) {
//   const grnDoc = await GRN.findById(invoiceData.grn).session(session);
//   if (grnDoc) {
//     grnDoc.status = "Close";
//     grnDoc.invoiceId = invoice._id;
//     await grnDoc.save({ session });
//     console.log(`✅ GRN ${grnDoc._id} marked as Invoiced`);
//   } else {
//     console.warn(`⚠️ GRN not found for ID: ${invoiceData.grn}`);
//   }
//   console.log(`⛔ Skipping stock update because invoice is GRN-based`);
// } else {
//   for (const item of invoiceData.items) {
//     await processInvoiceItem(item, invoice._id, decoded, session, linkedToPO);
//   }
// }


    

//     // ✅ Update linked Purchase Order
//     if (invoiceData.purchaseOrderId) {
//       const po = await PurchaseOrder.findById(invoiceData.purchaseOrderId).session(session);
//       if (po) {
//         let allItemsInvoiced = true;
//         for (const poItem of po.items) {
//           const invItem = invoiceData.items.find(i => i.item.toString() === poItem.item.toString());
//           if (invItem) {
//             poItem.receivedQuantity = (poItem.receivedQuantity || 0) + Number(invItem.quantity);
//           }
//           const remaining = Math.max(Number(poItem.orderedQuantity) - poItem.receivedQuantity, 0);
//           poItem.quantity = remaining;
//           if (remaining > 0) allItemsInvoiced = false;
//         }
//         po.orderStatus = allItemsInvoiced ? "Close" : "Open";
//         po.stockStatus = allItemsInvoiced ? "Updated" : "Adjusted";
//         await po.save({ session });
//       }
//     }

//     await session.commitTransaction();
//     session.endSession();

//     return NextResponse.json({ success: true, message: "Invoice created and stock updated successfully", data: invoice }, { status: 201 });

//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("POST /api/purchase-invoice error:", error);
//     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
//   }
// }





// export async function GET(req) {
//   try {
//     await dbConnect();

//     // Auth check
//     const token = getTokenFromHeader(req);
//     if (!token)
//       return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });

//     const user = verifyJWT(token);
//     if (!user)
//       return new Response(JSON.stringify({ message: "Invalid token" }), { status: 403 });

//     const { searchParams } = new URL(req.url);
//     const supplierCode = searchParams.get("supplierCode");

//     // 🛠 Build the query
//     const query = { companyId: user.companyId };
//     if (supplierCode) {
//       query.supplierCode = supplierCode; // ✅ use the direct field
//     }

//     const invoices = await PurchaseInvoice.find(query).sort({ createdAt: -1 });

//     return new Response(JSON.stringify({ success: true, data: invoices }), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     return new Response(
//       JSON.stringify({ success: false, message: "Server error", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }




