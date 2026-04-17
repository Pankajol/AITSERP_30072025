import mongoose from "mongoose";
import formidable from "formidable";
import { Readable } from "stream";
import dbConnect from "@/lib/db";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import SalesInvoice from "@/models/SalesInvoice";
import Customer from "@/models/CustomerModel";
import Warehouse from "@/models/warehouseModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";
import Counter from "@/models/Counter";

// ✅ ADD: Auto accounting entry import
import { autoSalesInvoice } from "@/lib/autoTransaction";

export const config = { api: { bodyParser: false } };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const { Types } = mongoose;

// --- Helpers (unchanged) ---
async function toNodeReq(request) {
  const buf = Buffer.from(await request.arrayBuffer());
  const nodeReq = new Readable({ read() { this.push(buf); this.push(null); } });
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

async function validateStockAvailability(items) {
  for (const item of items) {
    const warehouseDoc = await Warehouse.findById(item.warehouse).lean();
    if (!warehouseDoc) throw new Error(`Warehouse '${item.warehouseName}' not found.`);

    const useBins = warehouseDoc.binLocations && warehouseDoc.binLocations.length > 0;
    const query = { item: new Types.ObjectId(item.item), warehouse: new Types.ObjectId(item.warehouse) };
    if (useBins) {
      if (!item.selectedBin?._id) throw new Error(`A bin must be selected for '${item.itemName}'.`);
      query.bin = new Types.ObjectId(item.selectedBin._id);
    } else query.bin = { $in: [null, undefined] };

    const inventoryDoc = await Inventory.findOne(query).lean();
    const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;

    if (!inventoryDoc) throw new Error(`Stock Check Failed: No inventory for '${item.itemName}' in ${location}.`);
    if (inventoryDoc.quantity < item.quantity)
      throw new Error(`Stock Check Failed: Insufficient stock for '${item.itemName}' in ${location}. Required: ${item.quantity}, Available: ${inventoryDoc.quantity}.`);
  }
}

async function processItemForInvoice(item, session, invoice, decoded, isCopiedSO) {
  const warehouseDoc = await Warehouse.findById(item.warehouse).session(session).lean();
  if (!warehouseDoc) throw new Error(`Warehouse '${item.warehouseName}' not found.`);

  const useBins = warehouseDoc.binLocations && warehouseDoc.binLocations.length > 0;
  const query = { item: new Types.ObjectId(item.item), warehouse: new Types.ObjectId(item.warehouse) };
  let binId = null;

  if (useBins) {
    binId = new Types.ObjectId(item.selectedBin._id);
    query.bin = binId;
  } else query.bin = { $in: [null, undefined] };

  const inventoryDoc = await Inventory.findOne(query).session(session);
  if (!inventoryDoc) {
    const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;
    throw new Error(`Transaction failed: Inventory record for '${item.itemName}' in ${location} disappeared.`);
  }

  if (inventoryDoc.quantity < item.quantity) {
    const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;
    throw new Error(`Transaction failed: Insufficient stock for '${item.itemName}' in ${location}.`);
  }

  inventoryDoc.quantity -= item.quantity;
  if (isCopiedSO) inventoryDoc.committed = Math.max(0, (inventoryDoc.committed || 0) - item.quantity);

  await StockMovement.create([{
    item: item.item,
    warehouse: item.warehouse,
    bin: binId,
    movementType: "OUT",
    quantity: item.quantity,
    reference: invoice._id,
    referenceType: 'SalesInvoice',
    documentNumber: invoice.invoiceNumber,
    remarks: isCopiedSO ? "Invoice from SO" : "Direct Invoice",
    companyId: decoded.companyId,
  }], { session });

  await inventoryDoc.save({ session });
}

// --- POST Handler ---
export async function POST(req) {
  await dbConnect();

  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized: No token provided");
    const user = verifyJWT(token);
    if (!user?.companyId) throw new Error("Invalid token payload");

    const { fields, files } = await parseMultipart(req);
    const invoiceData = JSON.parse(fields.invoiceData || "{}");
    const isFromDelivery = invoiceData.sourceModel?.toLowerCase() === 'delivery';

    // 1. Validate stock before transaction
    if (!isFromDelivery) await validateStockAvailability(invoiceData.items);

    // 2. Upload files outside transaction (unchanged)
    const newFiles = Array.isArray(files.newAttachments)
      ? files.newAttachments
      : files.newAttachments ? [files.newAttachments] : [];
    const uploadedFiles = await Promise.all(
      newFiles.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.filepath, { folder: "invoices", resource_type: "auto" });
        return { fileName: file.originalFilename, fileUrl: result.secure_url, fileType: file.mimetype, publicId: result.public_id, uploadedAt: new Date() };
      })
    );
    invoiceData.attachments = [...(invoiceData.attachments || []), ...uploadedFiles];

    // 3. DB transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const now = new Date();
      const financialYear = now.getMonth() >= 3
        ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(-2)}`
        : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(-2)}`;

      const counterDoc = await Counter.findOneAndUpdate(
        { id: "SalesInvoice", companyId: user.companyId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, session }
      );

      invoiceData.invoiceNumber = `SALES-INV/${financialYear}/${String(counterDoc.seq).padStart(5, "0")}`;
      invoiceData.companyId = user.companyId;

      const [invoice] = await SalesInvoice.create([invoiceData], { session });

      // Deduct stock
      if (!isFromDelivery) {
        const isCopiedSO = invoiceData.sourceModel?.toLowerCase() === 'salesorder';
        for (const item of invoiceData.items) {
          await processItemForInvoice(item, session, invoice, user, isCopiedSO);
        }
      }

      await session.commitTransaction();
      session.endSession();

      // ✅ AUTO ACCOUNTING ENTRY (after commit)
      try {
        // --- FIX: Extract customer ID correctly ---
        let customerId = null;
        let customerName = invoiceData.customerName || "Customer";

        if (invoiceData.customer) {
          // customer can be an object with _id, or just a string ID
          if (typeof invoiceData.customer === 'object' && invoiceData.customer._id) {
            customerId = invoiceData.customer._id;
            customerName = invoiceData.customer.name || customerName;
          } else if (typeof invoiceData.customer === 'string') {
            customerId = invoiceData.customer;
          }
        } else if (invoiceData.customerId) {
          customerId = invoiceData.customerId;
        }

        // Also allow customerName from separate field
        if (invoiceData.customerName) customerName = invoiceData.customerName;
        else if (customerId) {
          // Optionally fetch name from Customer model if needed
          const cust = await Customer.findById(customerId).select("customerName");
          if (cust) customerName = cust.customerName;
        }

        // Determine total amount
        const totalAmount = invoiceData.grandTotal
          || invoiceData.totalAmount
          || invoiceData.total
          || 0;

        if (totalAmount <= 0) {
          console.warn(`⚠️ Skipping accounting entry for invoice ${invoice.invoiceNumber}: amount is zero`);
        } else if (!customerId) {
          console.warn(`⚠️ Skipping accounting entry for invoice ${invoice.invoiceNumber}: missing customer ID`);
        } else {
          await autoSalesInvoice({
            companyId:       user.companyId,
            amount:          totalAmount,
            partyId:         customerId,
            partyName:       customerName,
            referenceId:     invoice._id,
            referenceNumber: invoice.invoiceNumber,
            narration:       `Sales Invoice ${invoice.invoiceNumber} — ${customerName}`,
            date:            invoice.postingDate,
            createdBy:       user.id,
          });
          console.log(`✅ Accounting entry created for invoice ${invoice.invoiceNumber}`);
        }
      } catch (accountingErr) {
        // Accounting error does NOT rollback the invoice
        console.error(`⚠️ Accounting entry failed for invoice ${invoice.invoiceNumber}:`, accountingErr.message);
        // Optionally store the error in a separate log collection
      }

      return new Response(
        JSON.stringify({ success: true, message: "Invoice created successfully", invoiceId: invoice._id }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );

    } catch (error) {
      if (session.inTransaction()) await session.abortTransaction();
      session.endSession();
      throw error;
    }

  } catch (error) {
    console.error("Error creating Invoice:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// --- GET Handler (unchanged, but works) ---
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
    const customerCode = searchParams.get("customerCode");

    const query = { companyId: user.companyId };
    if (customerCode) query.customerCode = customerCode;

    const invoices = await SalesInvoice.find(query)
      .populate("customer")
      .sort({ createdAt: -1 });

    return new Response(JSON.stringify({ success: true, data: invoices }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("SalesInvoice GET error:", error);
    return new Response(
      JSON.stringify({ message: "Error fetching invoices", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}




// import mongoose from "mongoose";
// import formidable from "formidable";
// import { Readable } from "stream";
// import dbConnect from "@/lib/db";
// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";
// import SalesInvoice from "@/models/SalesInvoice";
// import Customer from "@/models/CustomerModel";
// import Warehouse from "@/models/warehouseModels";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { v2 as cloudinary } from "cloudinary";
// import Counter from "@/models/Counter";

// // ✅ ADD: Auto accounting entry import
// import { autoSalesInvoice } from "@/lib/autoTransaction";

// export const config = { api: { bodyParser: false } };

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const { Types } = mongoose;

// // --- Helpers --- (unchanged)
// async function toNodeReq(request) {
//   const buf = Buffer.from(await request.arrayBuffer());
//   const nodeReq = new Readable({ read() { this.push(buf); this.push(null); } });
//   nodeReq.headers = Object.fromEntries(request.headers.entries());
//   return nodeReq;
// }

// async function parseMultipart(request) {
//   const nodeReq = await toNodeReq(request);
//   const form = formidable({ multiples: true, keepExtensions: true });
//   return new Promise((res, rej) =>
//     form.parse(nodeReq, (err, fields, files) => (err ? rej(err) : res({ fields, files })))
//   );
// }

// async function validateStockAvailability(items) {
//   for (const item of items) {
//     const warehouseDoc = await Warehouse.findById(item.warehouse).lean();
//     if (!warehouseDoc) throw new Error(`Warehouse '${item.warehouseName}' not found.`);

//     const useBins = warehouseDoc.binLocations && warehouseDoc.binLocations.length > 0;
//     const query = { item: new Types.ObjectId(item.item), warehouse: new Types.ObjectId(item.warehouse) };
//     if (useBins) {
//       if (!item.selectedBin?._id) throw new Error(`A bin must be selected for '${item.itemName}'.`);
//       query.bin = new Types.ObjectId(item.selectedBin._id);
//     } else query.bin = { $in: [null, undefined] };

//     const inventoryDoc = await Inventory.findOne(query).lean();
//     const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;

//     if (!inventoryDoc) throw new Error(`Stock Check Failed: No inventory for '${item.itemName}' in ${location}.`);
//     if (inventoryDoc.quantity < item.quantity)
//       throw new Error(`Stock Check Failed: Insufficient stock for '${item.itemName}' in ${location}. Required: ${item.quantity}, Available: ${inventoryDoc.quantity}.`);
//   }
// }

// async function processItemForInvoice(item, session, invoice, decoded, isCopiedSO) {
//   const warehouseDoc = await Warehouse.findById(item.warehouse).session(session).lean();
//   if (!warehouseDoc) throw new Error(`Warehouse '${item.warehouseName}' not found.`);

//   const useBins = warehouseDoc.binLocations && warehouseDoc.binLocations.length > 0;
//   const query = { item: new Types.ObjectId(item.item), warehouse: new Types.ObjectId(item.warehouse) };
//   let binId = null;

//   if (useBins) {
//     binId = new Types.ObjectId(item.selectedBin._id);
//     query.bin = binId;
//   } else query.bin = { $in: [null, undefined] };

//   const inventoryDoc = await Inventory.findOne(query).session(session);
//   if (!inventoryDoc) {
//     const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;
//     throw new Error(`Transaction failed: Inventory record for '${item.itemName}' in ${location} disappeared.`);
//   }

//   if (inventoryDoc.quantity < item.quantity) {
//     const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;
//     throw new Error(`Transaction failed: Insufficient stock for '${item.itemName}' in ${location}.`);
//   }

//   inventoryDoc.quantity -= item.quantity;
//   if (isCopiedSO) inventoryDoc.committed = Math.max(0, (inventoryDoc.committed || 0) - item.quantity);

//   await StockMovement.create([{
//     item: item.item,
//     warehouse: item.warehouse,
//     bin: binId,
//     movementType: "OUT",
//     quantity: item.quantity,
//     reference: invoice._id,
//     referenceType: 'SalesInvoice',
//     documentNumber: invoice.invoiceNumber,
//     remarks: isCopiedSO ? "Invoice from SO" : "Direct Invoice",
//     companyId: decoded.companyId,
//   }], { session });

//   await inventoryDoc.save({ session });
// }

// // --- POST Handler ---
// export async function POST(req) {
//   await dbConnect();

//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) throw new Error("Unauthorized: No token provided");
//     const user = verifyJWT(token);
//     if (!user?.companyId) throw new Error("Invalid token payload");

//     const { fields, files } = await parseMultipart(req);
//     const invoiceData = JSON.parse(fields.invoiceData || "{}");
//     const isFromDelivery = invoiceData.sourceModel?.toLowerCase() === 'delivery';

//     // 1. Validate stock before transaction
//     if (!isFromDelivery) await validateStockAvailability(invoiceData.items);

//     // 2. Upload files outside transaction (unchanged)
//     const newFiles = Array.isArray(files.newAttachments)
//       ? files.newAttachments
//       : files.newAttachments ? [files.newAttachments] : [];
//     const uploadedFiles = await Promise.all(
//       newFiles.map(async (file) => {
//         const result = await cloudinary.uploader.upload(file.filepath, { folder: "invoices", resource_type: "auto" });
//         return { fileName: file.originalFilename, fileUrl: result.secure_url, fileType: file.mimetype, publicId: result.public_id, uploadedAt: new Date() };
//       })
//     );
//     invoiceData.attachments = [...(invoiceData.attachments || []), ...uploadedFiles];

//     // 3. DB transaction
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       const now = new Date();
//       const financialYear = now.getMonth() >= 3
//         ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(-2)}`
//         : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(-2)}`;

//       const counterDoc = await Counter.findOneAndUpdate(
//         { id: "SalesInvoice", companyId: user.companyId },
//         { $inc: { seq: 1 } },
//         { new: true, upsert: true, session }
//       );

//       invoiceData.invoiceNumber = `SALES-INV/${financialYear}/${String(counterDoc.seq).padStart(5, "0")}`;
//       invoiceData.companyId = user.companyId;

//       const [invoice] = await SalesInvoice.create([invoiceData], { session });

//       // Deduct stock
//       if (!isFromDelivery) {
//         const isCopiedSO = invoiceData.sourceModel?.toLowerCase() === 'salesorder';
//         for (const item of invoiceData.items) {
//           await processItemForInvoice(item, session, invoice, user, isCopiedSO);
//         }
//       }

//       await session.commitTransaction();
//       session.endSession();

//       // ✅ AUTO ACCOUNTING ENTRY
//       // Yahan add kiya — commitTransaction ke BAAD, session.endSession ke BAAD
//       // Reason: Accounting entry apna alag transaction use karti hai (autoTransaction.js ke andar)
//       // Agar invoice session ke andar daalo toh conflict hoga
//       // Agar invoice fail ho toh accounting entry bhi nahi hogi (kyunki commit ke baad hi aata hai)
//       try {
//         // Customer ka naam aur ID invoiceData se nikalna
//         const customerName = invoiceData.customerName
//           || invoiceData.customer?.name
//           || "Customer";

//         const customerId = invoiceData.customer
//           || invoiceData.customerId
//           || null;

//         await autoSalesInvoice({
//           companyId:       user.companyId,
//           amount:          invoiceData.grandTotal      // tumhara invoice total field
//                         || invoiceData.totalAmount
//                         || invoiceData.total
//                         || 0,
//           partyId:         customerId,
//           partyName:       customerName,
//           referenceId:     invoice._id,
//           referenceNumber: invoice.invoiceNumber,
//           narration:       `Sales Invoice ${invoice.invoiceNumber} — ${customerName}`,
//           date:            invoice.invoiceDate || new Date(),
//           createdBy:       user.id,
//         });
//       } catch (accountingErr) {
//         // ✅ Accounting error se invoice fail NAHI hoga
//         // Sirf log karo — baad mein manually post kar sakte hain
//         console.error(
//           `⚠️ Accounting entry failed for invoice ${invoice.invoiceNumber}:`,
//           accountingErr.message
//         );
//       }

//       return new Response(
//         JSON.stringify({ success: true, message: "Invoice created successfully", invoiceId: invoice._id }),
//         { status: 201, headers: { "Content-Type": "application/json" } }
//       );

//     } catch (error) {
//       if (session.inTransaction()) await session.abortTransaction();
//       session.endSession();
//       throw error;
//     }

//   } catch (error) {
//     console.error("Error creating Invoice:", error);
//     return new Response(
//       JSON.stringify({ success: false, message: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }


// export async function GET(req) {
//   try {
//     await dbConnect();

//     const token = getTokenFromHeader(req);
//     if (!token)
//       return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });

//     const user = verifyJWT(token);
//     if (!user)
//       return new Response(JSON.stringify({ message: "Invalid token" }), { status: 403 });

//     const { searchParams } = new URL(req.url);
//     const customerCode = searchParams.get("customerCode");

//     const query = { companyId: user.companyId };
//     if (customerCode) query.customerCode = customerCode;

//     const invoices = await SalesInvoice.find(query)
//       .populate("customer")
//       .sort({ createdAt: -1 });

//     return new Response(JSON.stringify({ success: true, data: invoices }), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });

//   } catch (error) {
//     console.error("SalesInvoice GET error:", error);
//     return new Response(
//       JSON.stringify({ message: "Error fetching invoices", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }




// import mongoose from "mongoose";
// import formidable from "formidable";
// import { Readable } from "stream";
// import dbConnect from "@/lib/db";
// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";
// import SalesInvoice from "@/models/SalesInvoice";
// import Customer from "@/models/CustomerModel";
// import Warehouse from "@/models/warehouseModels";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { v2 as cloudinary } from "cloudinary";
// import Counter from "@/models/Counter";

// export const config = { api: { bodyParser: false } };

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const { Types } = mongoose;

// // --- Helpers ---
// async function toNodeReq(request) {
//   const buf = Buffer.from(await request.arrayBuffer());
//   const nodeReq = new Readable({ read() { this.push(buf); this.push(null); } });
//   nodeReq.headers = Object.fromEntries(request.headers.entries());
//   return nodeReq;
// }

// async function parseMultipart(request) {
//   const nodeReq = await toNodeReq(request);
//   const form = formidable({ multiples: true, keepExtensions: true });
//   return new Promise((res, rej) =>
//     form.parse(nodeReq, (err, fields, files) => (err ? rej(err) : res({ fields, files })))
//   );
// }

// async function validateStockAvailability(items) {
//   for (const item of items) {
//     const warehouseDoc = await Warehouse.findById(item.warehouse).lean();
//     if (!warehouseDoc) throw new Error(`Warehouse '${item.warehouseName}' not found.`);

//     const useBins = warehouseDoc.binLocations && warehouseDoc.binLocations.length > 0;
//     const query = { item: new Types.ObjectId(item.item), warehouse: new Types.ObjectId(item.warehouse) };
//     if (useBins) {
//       if (!item.selectedBin?._id) throw new Error(`A bin must be selected for '${item.itemName}'.`);
//       query.bin = new Types.ObjectId(item.selectedBin._id);
//     } else query.bin = { $in: [null, undefined] };

//     const inventoryDoc = await Inventory.findOne(query).lean();
//     const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;

//     if (!inventoryDoc) throw new Error(`Stock Check Failed: No inventory for '${item.itemName}' in ${location}.`);
//     if (inventoryDoc.quantity < item.quantity)
//       throw new Error(`Stock Check Failed: Insufficient stock for '${item.itemName}' in ${location}. Required: ${item.quantity}, Available: ${inventoryDoc.quantity}.`);
//   }
// }

// async function processItemForInvoice(item, session, invoice, decoded, isCopiedSO) {
//   const warehouseDoc = await Warehouse.findById(item.warehouse).session(session).lean();
//   if (!warehouseDoc) throw new Error(`Warehouse '${item.warehouseName}' not found.`);

//   const useBins = warehouseDoc.binLocations && warehouseDoc.binLocations.length > 0;
//   const query = { item: new Types.ObjectId(item.item), warehouse: new Types.ObjectId(item.warehouse) };
//   let binId = null;

//   if (useBins) {
//     binId = new Types.ObjectId(item.selectedBin._id);
//     query.bin = binId;
//   } else query.bin = { $in: [null, undefined] };

//   const inventoryDoc = await Inventory.findOne(query).session(session);
//   if (!inventoryDoc) {
//     const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;
//     throw new Error(`Transaction failed: Inventory record for '${item.itemName}' in ${location} disappeared.`);
//   }

//   if (inventoryDoc.quantity < item.quantity) {
//     const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;
//     throw new Error(`Transaction failed: Insufficient stock for '${item.itemName}' in ${location}.`);
//   }

//   inventoryDoc.quantity -= item.quantity;
//   if (isCopiedSO) inventoryDoc.committed = Math.max(0, (inventoryDoc.committed || 0) - item.quantity);

//   await StockMovement.create([{
//     item: item.item,
//     warehouse: item.warehouse,
//     bin: binId,
//     movementType: "OUT",
//     quantity: item.quantity,
//     reference: invoice._id,
//     referenceType: 'SalesInvoice',
//     documentNumber: invoice.invoiceNumber,
//     remarks: isCopiedSO ? "Invoice from SO" : "Direct Invoice",
//     companyId: decoded.companyId,
//   }], { session });

//   await inventoryDoc.save({ session });
// }

// // --- API Handler ---
// export async function POST(req) {
//   await dbConnect();

//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) throw new Error("Unauthorized: No token provided");
//     const user = verifyJWT(token);
//     if (!user?.companyId) throw new Error("Invalid token payload");

//     const { fields, files } = await parseMultipart(req);
//     const invoiceData = JSON.parse(fields.invoiceData || "{}");
//     const isFromDelivery = invoiceData.sourceModel?.toLowerCase() === 'delivery';

//     // 1. Validate stock before transaction
//     if (!isFromDelivery) await validateStockAvailability(invoiceData.items);

//     // 2. Upload files **outside transaction**
//     const newFiles = Array.isArray(files.newAttachments)
//       ? files.newAttachments
//       : files.newAttachments ? [files.newAttachments] : [];
//     const uploadedFiles = await Promise.all(
//       newFiles.map(async (file) => {
//         const result = await cloudinary.uploader.upload(file.filepath, { folder: "invoices", resource_type: "auto" });
//         return { fileName: file.originalFilename, fileUrl: result.secure_url, fileType: file.mimetype, publicId: result.public_id, uploadedAt: new Date() };
//       })
//     );
//     invoiceData.attachments = [...(invoiceData.attachments || []), ...uploadedFiles];

//     // 3. Start transaction for DB operations only
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       const now = new Date();
//       const financialYear = now.getMonth() >= 3
//         ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(-2)}`
//         : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(-2)}`;

//       // --- Generate invoice number atomically using Counter only ---
//       const counterDoc = await Counter.findOneAndUpdate(
//         { id: "SalesInvoice", companyId: user.companyId },
//         { $inc: { seq: 1 } },
//         { new: true, upsert: true, session }
//       );

//       invoiceData.invoiceNumber = `SALES-INV/${financialYear}/${String(counterDoc.seq).padStart(5, "0")}`;
//       invoiceData.companyId = user.companyId;

//       const [invoice] = await SalesInvoice.create([invoiceData], { session });

//       // Deduct stock
//       if (!isFromDelivery) {
//         const isCopiedSO = invoiceData.sourceModel?.toLowerCase() === 'salesorder';
//         for (const item of invoiceData.items) {
//           await processItemForInvoice(item, session, invoice, user, isCopiedSO);
//         }
//       }

//       await session.commitTransaction();
//       session.endSession();

//       return new Response(
//         JSON.stringify({ success: true, message: "Invoice created successfully", invoiceId: invoice._id }),
//         { status: 201, headers: { "Content-Type": "application/json" } }
//       );

//     } catch (error) {
//       if (session.inTransaction()) await session.abortTransaction();
//       session.endSession();
//       throw error;
//     }

//   } catch (error) {
//     console.error("Error creating Invoice:", error);
//     return new Response(
//       JSON.stringify({ success: false, message: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }


// export async function GET(req) {
//   try {
//     await dbConnect();

//     // ✅ Authenticate request
//     const token = getTokenFromHeader(req);
//     if (!token)
//       return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });

//     const user = verifyJWT(token);
//     if (!user)
//       return new Response(JSON.stringify({ message: "Invalid token" }), { status: 403 });

//     // ✅ Parse query params
//     const { searchParams } = new URL(req.url);
//     const customerCode = searchParams.get("customerCode");

//     // ✅ Build secure query scoped to user's company
//     const query = { companyId: user.companyId };
//     if (customerCode) {
//       query.customerCode = customerCode;
//     }

//     // ✅ Fetch and populate
//     const invoices = await SalesInvoice.find(query)
//       .populate("customer") // Assuming 'customer' is a valid ref field in schema
//       .sort({ createdAt: -1 });

//     return new Response(JSON.stringify({ success: true, data: invoices }), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });

//   } catch (error) {
//     console.error("SalesInvoice GET error:", error);
//     return new Response(
//       JSON.stringify({ message: "Error fetching invoices", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }

