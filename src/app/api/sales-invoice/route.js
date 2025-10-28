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

export const config = { api: { bodyParser: false } };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const { Types } = mongoose;

// --- Helpers ---
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

// --- API Handler ---
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

    // 2. Upload files **outside transaction**
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

    // 3. Start transaction for DB operations only
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const now = new Date();
      const financialYear = now.getMonth() >= 3
        ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(-2)}`
        : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(-2)}`;

      // --- Generate invoice number atomically using Counter only ---
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



// import mongoose from "mongoose";
// import formidable from "formidable";
// import { Readable } from "stream";
// import dbConnect from "@/lib/db";
// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";
// import SalesOrder from "@/models/SalesOrder";
// import Delivery from "@/models/deliveryModels";
// import SalesInvoice from "@/models/SalesInvoice";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import Customer from "@/models/CustomerModel";
// import { v2 as cloudinary } from "cloudinary";
// import Counter from "@/models/Counter";

// export const config = {
//   api: { bodyParser: false },
// };

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
//   return new Promise((res, rej) =>
//     form.parse(nodeReq, (err, fields, files) =>
//       err ? rej(err) : res({ fields, files })
//     )
//   );
// }

// export async function POST(req) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) throw new Error("JWT token missing");
//     const user = verifyJWT(token);
//     if (!user) throw new Error("Unauthorized");

//     const { fields, files } = await parseMultipart(req);
//     const invoiceData = JSON.parse(fields.invoiceData || "{}");

//     invoiceData.invoiceDate = invoiceData.invoiceDate || new Date();
//     invoiceData.companyId = user.companyId;
//     if (user.type === "user") invoiceData.createdBy = user.id;
//     delete invoiceData._id;

//     if (Array.isArray(invoiceData.items)) {
//       invoiceData.items = invoiceData.items.map((item) => {
//         delete item._id;
//         return item;
//       });
//     }

//     // ✅ Upload attachments
//     const newFiles = Array.isArray(files.newAttachments)
//       ? files.newAttachments
//       : files.newAttachments
//       ? [files.newAttachments]
//       : [];

//     const uploadedFiles = await Promise.all(
//       newFiles.map(async (file) => {
//         const result = await cloudinary.uploader.upload(file.filepath, {
//           folder: "invoices",
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

//     invoiceData.attachments = [
//       ...(invoiceData.attachments || []),
//       ...uploadedFiles,
//     ];

//     // ✅ Generate Financial Year and Counter
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
//     const key = `SalesInvoice-${financialYear}`;

//     let counter = await Counter.findOne({
//       id: key,
//       companyId: user.companyId,
//     }).session(session);

//     if (!counter) {
//       [counter] = await Counter.create(
//         [{ id: key, companyId: user.companyId, seq: 1 }],
//         { session }
//       );
//     } else {
//       counter.seq += 1;
//       await counter.save({ session });
//     }

//     const paddedSeq = String(counter.seq).padStart(5, "0");
//     invoiceData.invoiceNumber = `SALES-INV/${financialYear}/${paddedSeq}`;

//     // ✅ Ensure amounts
//     const grandTotal = Number(invoiceData.grandTotal) || 0;
//     const paidAmount = Number(invoiceData.paidAmount) || 0;
//     invoiceData.openBalance = grandTotal;
//     invoiceData.remainingAmount = Math.max(grandTotal - paidAmount, 0);

//     const [invoice] = await SalesInvoice.create([invoiceData], { session });

//     const isCopied = !!invoiceData.sourceId;
//     const sourceModel = (invoiceData.sourceModel || "").toLowerCase();

//     // ✅ Inventory handling (only if not from Delivery)
//     if (!isCopied || sourceModel === "salesorder") {
//       for (const item of invoiceData.items) {
//         const inventoryDoc = await Inventory.findOne({
//           item: new Types.ObjectId(item.item),
//           warehouse: new Types.ObjectId(item.warehouse),
//         }).session(session);

//         if (!inventoryDoc)
//           throw new Error(`Inventory not found for ${item.item}`);

//         // ✅ Batch-level update
//         if (item.batches?.length > 0) {
//           for (const allocated of item.batches) {
//             const batchIndex = inventoryDoc.batches.findIndex(
//               (b) => b.batchNumber === allocated.batchCode
//             );
//             if (batchIndex === -1)
//               throw new Error(`Batch ${allocated.batchCode} not found`);
//             if (
//               inventoryDoc.batches[batchIndex].quantity <
//               allocated.allocatedQuantity
//             )
//               throw new Error(
//                 `Insufficient stock in batch ${allocated.batchCode}`
//               );
//             inventoryDoc.batches[batchIndex].quantity -=
//               allocated.allocatedQuantity;
//           }
//         }

//         if (inventoryDoc.quantity < item.quantity)
//           throw new Error(`Insufficient stock for ${item.item}`);
//         inventoryDoc.quantity -= item.quantity;

//         if (isCopied && sourceModel === "salesorder") {
//           inventoryDoc.committed = Math.max(
//             (inventoryDoc.committed || 0) - item.quantity,
//             0
//           );
//         }

//         await inventoryDoc.save({ session });

//         await StockMovement.create(
//           [
//             {
//               companyId: user.companyId,
//               item: item.item,
//               warehouse: item.warehouse,
//               movementType: "OUT",
//               quantity: item.quantity,
//               reference: invoice._id,
//               remarks: isCopied
//                 ? `Sales Invoice (From ${sourceModel.toUpperCase()})`
//                 : "Sales Invoice (Direct)",
//             },
//           ],
//           { session }
//         );
//       }
//     }

//     await session.commitTransaction();
//     session.endSession();

//     return new Response(
//       JSON.stringify({
//         success: true,
//         message: "Invoice created successfully, stock updated",
//         invoiceId: invoice._id,
//       }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     return new Response(
//       JSON.stringify({ success: false, message: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }








export async function GET(req) {
  try {
    await dbConnect();

    // ✅ Authenticate request
    const token = getTokenFromHeader(req);
    if (!token)
      return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });

    const user = verifyJWT(token);
    if (!user)
      return new Response(JSON.stringify({ message: "Invalid token" }), { status: 403 });

    // ✅ Parse query params
    const { searchParams } = new URL(req.url);
    const customerCode = searchParams.get("customerCode");

    // ✅ Build secure query scoped to user's company
    const query = { companyId: user.companyId };
    if (customerCode) {
      query.customerCode = customerCode;
    }

    // ✅ Fetch and populate
    const invoices = await SalesInvoice.find(query)
      .populate("customer") // Assuming 'customer' is a valid ref field in schema
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

