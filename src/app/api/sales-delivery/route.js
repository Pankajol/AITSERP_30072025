import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Delivery from "@/models/deliveryModels";
import SalesOrder from "@/models/SalesOrder";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import Counter from "@/models/Counter";
import Warehouse from "@/models/warehouseModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";
import formidable from "formidable";
import { Readable } from "stream";
import { v2 as cloudinary } from "cloudinary";

// --- Configuration ---
export const config = { api: { bodyParser: false } };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const { Types } = mongoose;

// --- Helper Functions for File Parsing ---
async function toNodeReq(request) {
  const buf = Buffer.from(await request.arrayBuffer());
  const nodeReq = new Readable({
    read() { this.push(buf); this.push(null); },
  });
  nodeReq.headers = Object.fromEntries(request.headers.entries());
  return nodeReq;
}

async function parseMultipart(request) {
  const nodeReq = await toNodeReq(request);
  const form = formidable({ multiples: true, keepExtensions: true });
  return new Promise((res, rej) =>
    form.parse(nodeReq, (err, fields, files) => (err ? rej(err) : res({ fields, files })))
  );
}

/**
 * Pre-validates stock for all items before starting the database transaction.
 */
async function validateStockAvailability(items) {
    for (const item of items) {
        const warehouseDoc = await Warehouse.findById(item.warehouse).lean();
        if (!warehouseDoc) throw new Error(`Warehouse '${item.warehouseName}' not found.`);
        
        const useBins = warehouseDoc.binLocations && warehouseDoc.binLocations.length > 0;
        const query = {
            item: new Types.ObjectId(item.item),
            warehouse: new Types.ObjectId(item.warehouse),
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
async function processItem(item, session, delivery, decoded, isCopiedSO) {
    const warehouseDoc = await Warehouse.findById(item.warehouse).session(session).lean();
    if (!warehouseDoc) throw new Error(`Warehouse '${item.warehouseName}' not found.`);
    
    const useBins = warehouseDoc.binLocations && warehouseDoc.binLocations.length > 0;
    const query = {
        item: new Types.ObjectId(item.item),
        warehouse: new Types.ObjectId(item.warehouse),
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

    if (!isCopiedSO) {
        if (inventoryDoc.quantity < item.quantity) {
            const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;
            throw new Error(`Transaction failed due to insufficient stock for '${item.itemName}' in ${location}.`);
        }
        inventoryDoc.quantity -= item.quantity;
    } else {
        inventoryDoc.committed = Math.max(0, (inventoryDoc.committed || 0) - item.quantity);
    }

    await StockMovement.create([{
        item: item.item,
        warehouse: item.warehouse,
        bin: binId,
        movementType: "OUT",
        quantity: item.quantity,
        reference: delivery._id,
        referenceType: 'Delivery',
        documentNumber: delivery.documentNumberDelivery,
        remarks: isCopiedSO ? "Delivery from SO" : "Direct Delivery",
        companyId: decoded.companyId,
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
        if (!token) throw new Error("Unauthorized: No token provided");
        const decoded = verifyJWT(token);
        if (!decoded?.companyId) throw new Error("Invalid token payload");

        const { fields, files } = await parseMultipart(req);
        const deliveryData = JSON.parse(fields.deliveryData || "{}");

        // ✅ 1. PRE-VALIDATION: Check stock availability BEFORE starting the transaction.
        await validateStockAvailability(deliveryData.items);

        // ✅ 2. START TRANSACTION: If stock is available, begin the database transaction.
        session.startTransaction();

        const seenItemBinPairs = new Set();
        for (const item of deliveryData.items) {
            const key = item.selectedBin?._id ? `${item.item}-${item.selectedBin._id}` : item.item;
            if (seenItemBinPairs.has(key)) {
                const location = item.selectedBin?.code ? `from bin '${item.selectedBin.code}'` : '';
                throw new Error(`Duplicate entry error: Item '${item.itemName}' ${location} can only be added once.`);
            }
            seenItemBinPairs.add(key);
        }

        // ✅ 3. FILE UPLOADS: Handle file uploads to Cloudinary.
        const newFiles = Array.isArray(files.newAttachments) ? files.newAttachments : files.newAttachments ? [files.newAttachments] : [];
        const uploadedFiles = await Promise.all(
            newFiles.map(async file => {
                const result = await cloudinary.uploader.upload(file.filepath, { folder: "deliveries", resource_type: "auto" });
                return {
                    fileName: file.originalFilename,
                    fileUrl: result.secure_url,
                    fileType: file.mimetype,
                    publicId: result.public_id,
                    uploadedAt: new Date(),
                };
            })
        );
        deliveryData.attachments = [...(deliveryData.attachments || []), ...uploadedFiles];

        // ✅ 4. CREATE DELIVERY & PROCESS ITEMS: Perform all database writes.
        deliveryData.companyId = decoded.companyId;
        const now = new Date();
        const financialYear = now.getMonth() >= 3 ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(-2)}` : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(-2)}`;
        const counter = await Counter.findOneAndUpdate(
            { id: "Sales Delivery", companyId: decoded.companyId },
            { $inc: { seq: 1 } },
            { new: true, upsert: true, session: session }
        );
        deliveryData.documentNumberDelivery = `SALES-DEL/${financialYear}/${String(counter.seq).padStart(5, "0")}`;

        const [delivery] = await Delivery.create([deliveryData], { session });
        const isCopiedSO = !!deliveryData.sourceId; // Assuming sourceId is used for SO link

        for (const item of deliveryData.items) {
            await processItem(item, session, delivery, decoded, isCopiedSO);
        }

        if (isCopiedSO && deliveryData.sourceModel?.toLowerCase() === 'salesorder') {
            // ... (Sales Order update logic)
        }

        // ✅ 5. COMMIT: If all steps succeed, commit the transaction.
        await session.commitTransaction();

        return NextResponse.json({
            success: true,
            message: "Delivery processed successfully.",
            deliveryId: delivery._id,
        }, { status: 201 });

    } catch (error) {
        // ✅ 6. ABORT: If any error occurs (including pre-check), abort the transaction.
        if (session.inTransaction()) {
            await session.abortTransaction();
        }
        console.error("Error processing Delivery:", error);
        return NextResponse.json({
            message: error.message,
            error: error.message,
        }, { status: 500 });
    } finally {
        session.endSession();
    }
}



// import mongoose from "mongoose";
// import formidable from "formidable";
// import { Readable } from "stream";
// import dbConnect from "@/lib/db";
// import Delivery from "@/models/deliveryModels";
// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";
// import SalesOrder from "@/models/SalesOrder";
// import SalesInvoice from "@/models/SalesInvoice";
// import Counter from "@/models/Counter";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { v2 as cloudinary } from "cloudinary";

// export const config = { api: { bodyParser: false } };

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const { Types } = mongoose;

// async function toNodeReq(request) {
//   const buf = Buffer.from(await request.arrayBuffer());
//   const nodeReq = new Readable({
//     read() {
//       this.push(buf);
//       this.push(null);
//     },
//   });
//   nodeReq.headers = Object.fromEntries(request.headers.entries());
//   nodeReq.method = request.method;
//   nodeReq.url = request.url || "/";
//   return nodeReq;
// }

// async function parseMultipart(request) {
//   const nodeReq = await toNodeReq(request);
//   const form = formidable({ multiples: true, keepExtensions: true });
//   return await new Promise((res, rej) =>
//     form.parse(nodeReq, (err, fields, files) => (err ? rej(err) : res({ fields, files })))
//   );
// }

// export async function POST(req) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) throw new Error("JWT token missing");
//     const user = await verifyJWT(token);
//     if (!user) throw new Error("Unauthorized");

//     const { fields, files } = await parseMultipart(req);
//     const deliveryData = JSON.parse(fields.deliveryData || "{}");

//     deliveryData.deliveryDate = deliveryData.deliveryDate || new Date();
//     deliveryData.deliveryType = deliveryData.deliveryType || "Sales";
//     deliveryData.companyId = user.companyId;
//     if (user.type === "user") deliveryData.createdBy = user.id;

//     delete deliveryData._id;
//     if (Array.isArray(deliveryData.items)) {
//       deliveryData.items = deliveryData.items.map(item => {
//         delete item._id;
//         return item;
//       });
//     }

//     // ---------------- Handle File Uploads ----------------
//     const newFiles = Array.isArray(files.newAttachments)
//       ? files.newAttachments
//       : files.newAttachments
//       ? [files.newAttachments]
//       : [];

//     const uploadedFiles = await Promise.all(
//       newFiles.map(async file => {
//         const result = await cloudinary.uploader.upload(file.filepath, {
//           folder: "deliveries",
//           resource_type: "auto",
//         });
//         return {
//           fileName: file.originalFilename,
//           fileUrl: result.secure_url,
//           fileType: file.mimetype,
//           uploadedAt: new Date(),
//         };
//       })
//     );

//     deliveryData.attachments = [
//       ...(deliveryData.attachments || []),
//       ...uploadedFiles,
//     ];

//     // ---------------- Generate Document Number ----------------
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
//     const counterKey = "Sales Delivery";

//     let counter = await Counter.findOne({ id: counterKey, companyId: user.companyId }).session(session);
//     if (!counter) {
//       const [created] = await Counter.create(
//         [{ id: counterKey, companyId: user.companyId, seq: 1 }],
//         { session }
//       );
//       counter = created;
//     } else {
//       counter.seq += 1;
//       await counter.save({ session });
//     }

//     const paddedSeq = String(counter.seq).padStart(5, "0");
//     deliveryData.documentNumberDelivery = `SALES-DEL/${financialYear}/${paddedSeq}`;

//     // ---------------- Create Delivery ----------------
//     const [delivery] = await Delivery.create([deliveryData], { session });

//     const isCopied = !!deliveryData.sourceId;
//     const sourceModel = (deliveryData.sourceModel || "salesorder").toLowerCase();

//     // ---------------- Update Inventory ----------------
//     for (const item of deliveryData.items) {
//       const inventoryDoc = await Inventory.findOne({
//         item: new Types.ObjectId(item.item),
//         warehouse: new Types.ObjectId(item.warehouse),
//       }).session(session);

//       if (!inventoryDoc) throw new Error(`No inventory record for item ${item.item}`);

//       if (item.batches?.length > 0) {
//         for (const allocated of item.batches) {
//           const batchIndex = inventoryDoc.batches.findIndex(b => b.batchNumber === allocated.batchCode);
//           if (batchIndex === -1) throw new Error(`Batch ${allocated.batchCode} not found`);
//           if (inventoryDoc.batches[batchIndex].quantity < allocated.allocatedQuantity) {
//             throw new Error(`Insufficient stock in batch ${allocated.batchCode}`);
//           }
//           inventoryDoc.batches[batchIndex].quantity -= allocated.allocatedQuantity;
//         }
//       }

//       if (inventoryDoc.quantity < item.quantity) {
//         throw new Error(`Insufficient stock for item ${item.item}`);
//       }

//       inventoryDoc.quantity -= item.quantity;
//       inventoryDoc.committed = Math.max((inventoryDoc.committed || 0) - item.quantity, 0);
//       await inventoryDoc.save({ session });

//       await StockMovement.create(
//         [{
//           companyId: user.companyId,
//           item: item.item,
//           warehouse: item.warehouse,
//           movementType: "OUT",
//           quantity: item.quantity,
//           reference: delivery._id,
//           remarks: sourceModel === "salesorder" ? "Sales Order Delivery" : "Delivery",
//         }],
//         { session }
//       );
//     }

//     // ---------------- Update Source Document (SO / SI) ----------------
//     if (isCopied && sourceModel === "salesorder") {
//       const so = await SalesOrder.findById(deliveryData.sourceId).session(session);
//       if (!so) throw new Error("Sales Order not found");

//       // Update delivered quantities
//       for (const soItem of so.items) {
//         const deliveredItem = deliveryData.items.find(i => i.item.toString() === soItem.item.toString());
//         if (deliveredItem) {
//           soItem.deliveredQuantity = (soItem.deliveredQuantity || 0) + deliveredItem.quantity;
//         }
//       }

//       // Update status
//       const allDelivered = so.items.every(i => i.deliveredQuantity >= i.quantity);
//       const anyDelivered = so.items.some(i => i.deliveredQuantity > 0);
//       so.status = allDelivered ? "Complete" : anyDelivered ? "Partially Complete" : "Pending";

//       await so.save({ session });
//     }

//     // Handle multiple linked sales orders (optional)
//     if (Array.isArray(deliveryData.salesOrder) && deliveryData.salesOrder.length > 0) {
//       await SalesOrder.updateMany(
//         { _id: { $in: deliveryData.salesOrder }, companyId: user.companyId },
//         {
//           $set: {
//             linkedPurchaseOrder: delivery._id,
//             status: "completed",
//           },
//         },
//         { session }
//       );
//     }

//     await session.commitTransaction();
//     session.endSession();

//     return new Response(
//       JSON.stringify({ success: true, message: "Delivery processed successfully", deliveryId: delivery._id }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );

//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("Delivery creation failed:", error);
//     return new Response(
//       JSON.stringify({ success: false, message: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }











export async function GET(req) {
  try {
    // ✅ Step 1: Extract and verify the JWT
    const token = getTokenFromHeader(req);
    if (!token) {
      return new Response(JSON.stringify({ message: "Unauthorized: No token provided" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = verifyJWT(token); // Throws error if token is invalid
    if (!user) {
      return new Response(JSON.stringify({ message: "Unauthorized: Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✅ Step 2: DB connection and data fetch
    await dbConnect();
    const salesDeliveries = await Delivery.find({companyId: user.companyId});

    return new Response(JSON.stringify(salesDeliveries), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error fetching SalesDeliveries:", error);
    return new Response(
      JSON.stringify({ message: "Error fetching SalesDeliveries", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
