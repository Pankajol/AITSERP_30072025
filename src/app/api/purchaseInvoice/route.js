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


export const dynamic = 'force-dynamic';

// ✅ Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** ✅ Convert Fetch Request for formidable */
function createNodeCompatibleRequest(req) {
  const nodeReq = Readable.fromWeb(req.body);
  nodeReq.headers = Object.fromEntries(req.headers.entries());
  nodeReq.method = req.method;
  return nodeReq;
}

/** ✅ Parse form-data */
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

/** ✅ Upload files to Cloudinary */
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

/** ✅ Delete Files from Cloudinary */
async function deleteFilesByPublicIds(publicIds) {
  if (!publicIds || publicIds.length === 0) return;
  for (const publicId of publicIds) {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      console.error("Cloudinary delete error:", err);
    }
  }
}

/** ✅ Process Inventory & Stock Movement */
async function processInvoiceItem(item, invoiceId, decoded, session, linkedToPO = false) {
  const qty = Number(item.quantity);
  const itemId = item.item?._id || item.item;
  const warehouseId = item.warehouse;

  if (!itemId || !warehouseId || qty <= 0) {
    throw new Error(`Invalid item data for ${item.itemCode || 'unknown item'}`);
  }

  let inventoryDoc = await Inventory.findOne({
    item: new Types.ObjectId(itemId),
    warehouse: new Types.ObjectId(warehouseId),
    companyId: decoded.companyId,
  }).session(session);

  if (!inventoryDoc) {
    inventoryDoc = await Inventory.create([{
      item: new Types.ObjectId(itemId),
      warehouse: new Types.ObjectId(warehouseId),
      companyId: decoded.companyId,
      quantity: 0,
      onOrder: 0,
      batches: [],
    }], { session });
    inventoryDoc = inventoryDoc[0];
  }

  // ✅ If PO is linked, reduce onOrder
  if (linkedToPO) {
    inventoryDoc.onOrder = Math.max((inventoryDoc.onOrder || 0) - qty, 0);
  }

  // ✅ Batch handling
  if (item.managedBy?.toLowerCase() === "batch" && Array.isArray(item.batches)) {
    for (const b of item.batches) {
      const batchQty = Number(b.batchQuantity);
      if (!b.batchNumber || isNaN(batchQty) || batchQty <= 0) continue;
      const existingBatch = inventoryDoc.batches.find(batch => batch.batchNumber === b.batchNumber);
      if (existingBatch) {
        existingBatch.quantity += batchQty;
      } else {
        inventoryDoc.batches.push({
          batchNumber: b.batchNumber,
          quantity: batchQty,
          expiryDate: b.expiryDate ? new Date(b.expiryDate) : null,
          manufacturer: b.manufacturer || '',
        });
      }
    }
  }

  inventoryDoc.quantity += qty;
  await inventoryDoc.save({ session });

  // ✅ Stock Movement
  await StockMovement.create([{
    item: new Types.ObjectId(itemId),
    warehouse: new Types.ObjectId(warehouseId),
    movementType: "IN",
    quantity: qty,
    reference: invoiceId,
    referenceType: "PurchaseInvoice",
    remarks: linkedToPO ? "Stock received via Purchase Invoice (Linked PO)" : "Stock received via Purchase Invoice",
    companyId: decoded.companyId,
    createdBy: decoded.userId,
  }], { session });
}


/** ✅ POST - Create Purchase Invoice */
export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized");
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) throw new Error("Invalid token payload");

    const { fields, files } = await parseForm(req);
    const invoiceData = JSON.parse(fields.invoiceData || "{}");
    const removedFilesPublicIds = JSON.parse(fields.removedFiles || "[]");
    const existingFilesMetadata = JSON.parse(fields.existingFiles || "[]");

    invoiceData.companyId = decoded.companyId;
    delete invoiceData._id;

    // ✅ Upload new files
    const newUploadedFiles = await uploadFiles(files.newAttachments || [], "purchase-invoices", decoded.companyId);
    invoiceData.attachments = [
      ...(Array.isArray(existingFilesMetadata) ? existingFilesMetadata.filter(f => !removedFilesPublicIds.includes(f.publicId)) : []),
      ...newUploadedFiles,
    ];

    // ✅ Delete removed files
    await deleteFilesByPublicIds(removedFilesPublicIds);

    if (!invoiceData.items || !Array.isArray(invoiceData.items) || invoiceData.items.length === 0) {
      throw new Error("Invoice must contain at least one item");
    }

    const grandTotal = Number(invoiceData.grandTotal) || 0;
const paidAmount = Number(invoiceData.paidAmount) || 0;

if (invoiceData.remainingAmount < 0) {
  invoiceData.remainingAmount = 0;
}

// Calculate remaining amount
invoiceData.remainingAmount = grandTotal - paidAmount;
    // ✅ Save Invoice
    const [invoice] = await PurchaseInvoice.create([invoiceData], { session });

    // ✅ Update Inventory for ALL invoices
    // const linkedToPO = !!invoiceData.purchaseOrderId;
    // for (const item of invoiceData.items) {
    //   await processInvoiceItem(item, invoice._id, decoded, session, linkedToPO);
    // }

    const linkedToPO = !!invoiceData.purchaseOrderId;

// ✅ Only update stock if NOT a GRN copy
if (invoiceData.invoiceType !== "GRNCopy") {
  for (const item of invoiceData.items) {
    await processInvoiceItem(item, invoice._id, decoded, session, linkedToPO);
  }
} else {
  console.log(`Skipping stock update for GRN-based invoice (ID: ${invoice._id})`);
}
// ✅ Update GRN status if this invoice is based on GRN
if (invoiceData.invoiceType === "GRNCopy" && invoiceData.grn) {
  const GRNModel = mongoose.model("GRN"); // Adjust model name if different
  const grnDoc = await GRNModel.findById(invoiceData.grn).session(session);

  if (grnDoc) {
    grnDoc.status = "Close"; // Or "LinkedToInvoice"
    grnDoc.invoiceId = invoice._id; // Optional: link back to PI
    await grnDoc.save({ session });
    console.log(`✅ GRN ${grnDoc._id} marked as Invoiced`);
  } else {
    console.warn(`⚠️ GRN not found for ID: ${invoiceData.grn}`);
  }
}

    

    // ✅ Update linked Purchase Order
    if (invoiceData.purchaseOrderId) {
      const po = await PurchaseOrder.findById(invoiceData.purchaseOrderId).session(session);
      if (po) {
        let allItemsInvoiced = true;
        for (const poItem of po.items) {
          const invItem = invoiceData.items.find(i => i.item.toString() === poItem.item.toString());
          if (invItem) {
            poItem.receivedQuantity = (poItem.receivedQuantity || 0) + Number(invItem.quantity);
          }
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

    return NextResponse.json({ success: true, message: "Invoice created and stock updated successfully", data: invoice }, { status: 201 });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("POST /api/purchase-invoice error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


/** ✅ GET - Fetch all invoices */
// export async function GET(req) {
//   try {
//     await dbConnect();

//     // ✅ Authentication
//     const token = getTokenFromHeader(req);
//     if (!token)
//       return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

//     const user = verifyJWT(token);
//     if (!user)
//       return NextResponse.json({ success: false, message: "Invalid token" }, { status: 403 });

//     // ✅ Extract query params
//     const { searchParams } = new URL(req.url);
//     const supplierCode = searchParams.get("supplierCode");

//     // ✅ Build base query
//     let query = {
//       companyId: user.companyId, // scope to logged-in company
//     };

//     // ✅ If supplierCode is given, find its _id
//     if (supplierCode) {
//       const supplier = await Supplier.findOne({ code: supplierCode });
//       if (!supplier) {
//         return NextResponse.json({ success: true, data: [] }, { status: 200 });
//       }
//       query.supplier = supplier._id;
//     }

//     // ✅ Fetch purchase invoices
//     const invoices = await PurchaseInvoice.find(query)
//       .populate("supplier") // optional: include supplier info
//       .sort({ createdAt: -1 });

//     return NextResponse.json({ success: true, data: invoices }, { status: 200 });

//   } catch (error) {
//     return NextResponse.json(
//       { success: false, message: "Error fetching purchase invoices", error: error.message },
//       { status: 500 }
//     );
//   }
// }


export async function GET(req) {
  try {
    await dbConnect();

    // Auth check
    const token = getTokenFromHeader(req);
    if (!token)
      return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });

    const user = verifyJWT(token);
    if (!user)
      return new Response(JSON.stringify({ message: "Invalid token" }), { status: 403 });

    const { searchParams } = new URL(req.url);
    const supplierCode = searchParams.get("supplierCode");

    // 🛠 Build the query
    const query = { companyId: user.companyId };
    if (supplierCode) {
      query.supplierCode = supplierCode; // ✅ use the direct field
    }

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
// import mongoose from "mongoose";
// import { v2 as cloudinary } from "cloudinary";
// import formidable from "formidable";
// import { Readable } from "stream";
// import dbConnect from "@/lib/db";
// import PurchaseInvoice from "@/models/InvoiceModel";
// import PurchaseOrder from "@/models/PurchaseOrder";
// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";
// import GRN from "@/models/grnModels";
// import Supplier from "@/models/SupplierModels";
// import ItemModels from "@/models/ItemModels";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { Types } from "mongoose";

// // Configure Cloudinary
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // Parse form-data
// function requestToNodeStream(req) {
//   return Readable.fromWeb(req.body);
// }
// async function parseForm(req) {
//   const form = formidable({ multiples: true });
//   const headers = {};
//   req.headers.forEach((value, key) => {
//     headers[key.toLowerCase()] = value;
//   });

//   return new Promise((resolve, reject) => {
//     form.parse(Object.assign(requestToNodeStream(req), { headers, method: req.method }),
//       (err, fields, files) => {
//         if (err) return reject(err);
//         const parsedFields = {};
//         for (const key in fields) {
//           parsedFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
//         }
//         const parsedFiles = {};
//         for (const key in files) {
//           parsedFiles[key] = Array.isArray(files[key]) ? files[key] : [files[key]];
//         }
//         resolve({ fields: parsedFields, files: parsedFiles });
//       });
//   });
// }

// // ✅ Upload files to Cloudinary
// async function uploadFiles(fileObjects) {
//   const uploadedFiles = [];
//   if (fileObjects && fileObjects.length > 0) {
//     for (const file of fileObjects) {
//       if (!file || !file.filepath) continue;
//       const result = await cloudinary.uploader.upload(file.filepath, {
//         folder: "purchase-invoices",
//         resource_type: "auto",
//       });
//       uploadedFiles.push({
//         fileName: file.originalFilename,
//         fileUrl: result.secure_url,
//         fileType: file.mimetype,
//         uploadedAt: new Date(),
//         publicId: result.public_id,
//       });
//     }
//   }
//   return uploadedFiles;
// }

// export async function POST(req) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     // ✅ Token validation
//     const token = getTokenFromHeader(req);
//     if (!token) throw new Error("Unauthorized");
//     const decoded = verifyJWT(token);

//     // ✅ Parse form data
//     const { fields, files } = await parseForm(req);
//     if (!fields.invoiceData) throw new Error("Missing invoiceData");
//     const invoiceData = JSON.parse(fields.invoiceData);
//     invoiceData.companyId = decoded.companyId;
//     delete invoiceData._id;

//     // ✅ Handle attachments
//     const newUploadedFiles = await uploadFiles(files.attachments || []);
//     let existingFiles = [];
//     let removedFiles = [];

//     if (fields["existingFiles[]"]) {
//       try {
//         existingFiles = Array.isArray(fields["existingFiles[]"])
//           ? fields["existingFiles[]"].map((f) => JSON.parse(f))
//           : [JSON.parse(fields["existingFiles[]"])];
//       } catch {
//         existingFiles = [];
//       }
//     }

//     if (fields["removedFiles[]"]) {
//       try {
//         removedFiles = Array.isArray(fields["removedFiles[]"])
//           ? fields["removedFiles[]"].map((f) => JSON.parse(f))
//           : [JSON.parse(fields["removedFiles[]"])];
//       } catch {
//         removedFiles = [];
//       }
//     }

//     invoiceData.attachments = [...existingFiles, ...newUploadedFiles];

//     // ✅ Clean item data
//     if (Array.isArray(invoiceData.items)) {
//       invoiceData.items = invoiceData.items.map((item) => {
//         delete item._id;
//         return item;
//       });
//     }

//     let purchaseOrderId = invoiceData.purchaseOrderId || null;
//     if (purchaseOrderId) delete invoiceData.purchaseOrderId;

//     // ✅ Validation: Required fields & quantities
//     for (const [i, item] of invoiceData.items.entries()) {
//       if (!item.item || !item.warehouse) {
//         throw new Error(`Row ${i + 1}: Missing item or warehouse ObjectId`);
//       }
//       if (!Types.ObjectId.isValid(item.warehouse)) {
//         throw new Error(`Row ${i + 1}: Invalid warehouse ID`);
//       }
//       const allowedQty = Number(item.allowedQuantity) || 0;
//       if (allowedQty > 0 && Number(item.quantity) > allowedQty) {
//         throw new Error(
//           `Row ${i + 1} (${item.itemCode}): Quantity exceeds allowed (${allowedQty})`
//         );
//       }
//     }

//     // ✅ Validation: Batch-managed items
//     for (const [i, item] of invoiceData.items.entries()) {
//       if (item.managedBy?.toLowerCase() === "batch") {
//         const totalBatchQty = (item.batches || []).reduce(
//           (sum, b) => sum + (Number(b.batchQuantity) || 0),
//           0
//         );
//         if (totalBatchQty !== Number(item.quantity)) {
//           throw new Error(
//             `Row ${i + 1} (${item.itemCode}): Batch qty mismatch (Expected ${item.quantity}, got ${totalBatchQty})`
//           );
//         }
//       }
//     }

//     // ✅ Create invoice
//     const [invoice] = await PurchaseInvoice.create([invoiceData], { session });

//     // ✅ Update inventory (Normal invoice only)
//     if (invoiceData.invoiceType === "Normal") {
//       for (const item of invoiceData.items) {
//         await Inventory.updateOne(
//           { item: item.item, warehouse: item.warehouse },
//           { $inc: { quantity: Number(item.quantity) } },
//           { upsert: true, session }
//         );
//         await StockMovement.create(
//           [
//             {
//               item: item.item,
//               warehouse: item.warehouse,
//               movementType: "IN",
//               quantity: Number(item.quantity),
//               reference: invoice._id,
//               remarks: "Stock updated via Purchase Invoice",
//               createdBy: decoded.userId,
//             },
//           ],
//           { session }
//         );
//       }
//     }

//     // ✅ Update linked Purchase Order
//     if (purchaseOrderId) {
//       const po = await PurchaseOrder.findById(purchaseOrderId).session(session);
//       if (po) {
//         let allItemsInvoiced = true;
//         for (const poItem of po.items) {
//           poItem.receivedQuantity = poItem.receivedQuantity || 0;
//           const invItem = invoiceData.items.find(
//             (i) => i.item.toString() === poItem.item.toString()
//           );
//           if (invItem) {
//             poItem.receivedQuantity += Number(invItem.quantity) || 0;
//           }
//           const remaining = Math.max(
//             Number(poItem.orderedQuantity) - poItem.receivedQuantity,
//             0
//           );
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

//     return NextResponse.json(
//       { success: true, message: "Invoice processed", invoiceId: invoice._id },
//       { status: 201 }
//     );
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("Error:", error);
//     return NextResponse.json(
//       { success: false, message: error.message },
//       { status: 500 }
//     );
//   }
// }


// // ✅ GET - Fetch all invoices
// export async function GET() {
//   try {
//     await dbConnect();
//     const invoices = await PurchaseInvoice.find()
//       .populate("supplier")
//       .sort({ createdAt: -1 });
//     return NextResponse.json({ success: true, data: invoices }, { status: 200 });
//   } catch (error) {
//     return NextResponse.json({ success: false, message: error.message }, { status: 500 });
//   }
// }
