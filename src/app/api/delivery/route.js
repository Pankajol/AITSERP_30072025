import mongoose from "mongoose";
import { Readable } from "stream";
import formidable from "formidable";
import { v2 as cloudinary } from "cloudinary";
import dbConnect from "@/lib/db";
import Delivery from "@/models/deliveryModels";
import SalesOrder from "@/models/SalesOrder";
import Counter from "@/models/Counter";
import Warehouse from "@/models/warehouseModels";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";
import Customer from '@/models/CustomerModel';
import Item from '@/models/ItemModels';

export const config = { api: { bodyParser: false } };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const { Types } = mongoose;

// ──────────────────────────────────────────────────────────────
// Helper: parse multipart form data
// ──────────────────────────────────────────────────────────────
async function parseMultipart(req) {
  const buf = Buffer.from(await req.arrayBuffer());
  const nodeReq = new Readable();
  nodeReq.push(buf);
  nodeReq.push(null);
  nodeReq.headers = Object.fromEntries(req.headers.entries());
  nodeReq.method = req.method;
  const form = formidable({ multiples: true, keepExtensions: true });
  return new Promise((resolve, reject) => {
    form.parse(nodeReq, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

// ──────────────────────────────────────────────────────────────
// Helper: validate physical stock (not committed)
// ──────────────────────────────────────────────────────────────
async function validateStockAvailability(items, companyId) {
  for (const item of items) {
    const warehouse = await Warehouse.findById(item.warehouse).lean();
    if (!warehouse) throw new Error(`Warehouse not found for ${item.itemName}`);
    const useBins = warehouse.binLocations?.length > 0;
    const variantId = item.variant?.variantId || item.selectedVariantId;
    const query = {
      companyId: new Types.ObjectId(companyId),
      item: new Types.ObjectId(item.item),
      warehouse: new Types.ObjectId(item.warehouse),
    };
    if (useBins) {
      if (!item.selectedBin) throw new Error(`Bin required for ${item.itemName}`);
      query.bin = new Types.ObjectId(item.selectedBin);
    } else {
      query.bin = { $in: [null, undefined] };
    }
    const inventory = await Inventory.findOne(query).lean();
    if (!inventory) throw new Error(`No inventory for ${item.itemName} in ${warehouse.warehouseName}`);
    let available = 0;
    if (variantId) {
      const variantInv = inventory.variantInventory?.find(v => v.variantId.toString() === variantId.toString());
      if (!variantInv) throw new Error(`Variant ${item.itemCode} not found in inventory`);
      available = variantInv.quantity;
    } else {
      available = inventory.quantity;
    }
    if (available < item.quantity) {
      throw new Error(`Insufficient stock for ${item.itemName}${variantId ? ` (${item.itemCode})` : ''}. Required: ${item.quantity}, Available: ${available}`);
    }
  }
}

// ──────────────────────────────────────────────────────────────
// Helper: process item – deduct physical stock and committed (if from SO)
// ──────────────────────────────────────────────────────────────
async function processItem(item, deliveryId, decoded, session, fromSalesOrder) {
  console.log(`🔄 Processing item: ${item.itemCode}, qty: ${item.quantity}, fromSalesOrder: ${fromSalesOrder}`);

  const warehouse = await Warehouse.findById(item.warehouse).session(session);
  if (!warehouse) throw new Error(`Warehouse not found`);
  const useBins = warehouse.binLocations?.length > 0;
  const variantId = item.variant?.variantId || item.selectedVariantId;
  const query = {
    companyId: new Types.ObjectId(decoded.companyId),
    item: new Types.ObjectId(item.item),
    warehouse: new Types.ObjectId(item.warehouse),
  };
  let binId = null;
  if (useBins && item.selectedBin) {
    binId = new Types.ObjectId(item.selectedBin);
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
    console.log(`🆕 Created new inventory record for item ${item.itemCode}`);
  }

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
      console.log(`🆕 Created variant entry for ${item.itemCode}`);
    }
    console.log(`[Variant BEFORE] quantity: ${variantInv.quantity}, committed: ${variantInv.committed}`);
    if (variantInv.quantity < item.quantity) throw new Error(`Insufficient stock for variant ${item.itemCode}`);
    
    if (fromSalesOrder) {
      variantInv.committed = Math.max(0, variantInv.committed - item.quantity);
      console.log(`📉 Variant committed DECREASED to ${variantInv.committed}`);
    }
    variantInv.quantity -= item.quantity;
    console.log(`📉 Variant quantity DECREASED to ${variantInv.quantity}`);
  } else {
    console.log(`[Item BEFORE] quantity: ${inventory.quantity}, committed: ${inventory.committed}`);
    if (inventory.quantity < item.quantity) throw new Error(`Insufficient stock for ${item.itemName}`);
    
    if (fromSalesOrder) {
      inventory.committed = Math.max(0, inventory.committed - item.quantity);
      console.log(`📉 Item committed DECREASED to ${inventory.committed}`);
    }
    inventory.quantity -= item.quantity;
    console.log(`📉 Item quantity DECREASED to ${inventory.quantity}`);
  }

  await inventory.save({ session });

  await StockMovement.create([{
    companyId: decoded.companyId,
    createdBy: decoded.id,
    item: new Types.ObjectId(item.item),
    variantId: variantId ? new Types.ObjectId(variantId) : null,
    warehouse: new Types.ObjectId(item.warehouse),
    bin: binId,
    movementType: "OUT",
    quantity: item.quantity,
    reference: deliveryId,
    referenceType: "Delivery",
    remarks: fromSalesOrder ? "Delivery from Sales Order (released committed + physical)" : "Direct Delivery (physical only)",
    date: new Date(),
  }], { session });
}

// ──────────────────────────────────────────────────────────────
// POST – Create Delivery
// ──────────────────────────────────────────────────────────────
export async function POST(req) {
  await dbConnect();
  let session = null;
  let committed = false;

  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized");
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) throw new Error("Invalid token");

    const { fields, files } = await parseMultipart(req);
    const deliveryData = JSON.parse(fields.deliveryData || "{}");

    if (!deliveryData.items?.length) throw new Error("At least one item required");

    const fromSalesOrder = !!deliveryData.salesOrderId;
    console.log(`🔍 fromSalesOrder: ${fromSalesOrder}, salesOrderId: ${deliveryData.salesOrderId}`);

    // Pre‑validate physical stock
    await validateStockAvailability(deliveryData.items, decoded.companyId);

    session = await mongoose.startSession();
    session.startTransaction();

    // ---- Handle file uploads ----
    const fileArray = Array.isArray(files.attachments) ? files.attachments : files.attachments ? [files.attachments] : [];
    const uploadedFiles = [];
    for (const file of fileArray) {
      if (!file?.filepath) continue;
      const result = await cloudinary.uploader.upload(file.filepath, {
        folder: "deliveries",
        resource_type: "auto",
      });
      uploadedFiles.push({
        fileName: file.originalFilename,
        fileUrl: result.secure_url,
        fileType: file.mimetype,
        uploadedAt: new Date(),
        publicId: result.public_id,
      });
    }
    const existingFiles = deliveryData.existingFiles || [];
    const removedPublicIds = deliveryData.removedFiles?.map(f => f.publicId) || [];
    for (const pubId of removedPublicIds) {
      await cloudinary.uploader.destroy(pubId).catch(e => console.warn(e));
    }
    deliveryData.attachments = [
      ...existingFiles.filter(f => !removedPublicIds.includes(f.publicId)),
      ...uploadedFiles,
    ];
    delete deliveryData.existingFiles;
    delete deliveryData.removedFiles;
    // ---- End attachments ----

    deliveryData.companyId = decoded.companyId;
    deliveryData.createdBy = decoded.id;
    delete deliveryData._id;

    // ---- Generate document number ----
    const now = new Date();
    const financialYear = now.getMonth() >= 3
      ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(-2)}`
      : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(-2)}`;
    const key = "SalesDelivery";

    let counter = await Counter.findOne({ id: key, companyId: decoded.companyId }).session(session);
    if (!counter) {
      const [created] = await Counter.create([{ id: key, companyId: decoded.companyId, seq: 1 }], { session });
      counter = created;
    } else {
      counter.seq += 1;
      await counter.save({ session });
    }
    deliveryData.documentNumberDelivery = `SALES-DEL/${financialYear}/${String(counter.seq).padStart(5, "0")}`;

    const [delivery] = await Delivery.create([deliveryData], { session });

    // Process each item (stock deduction)
    for (const item of deliveryData.items) {
      await processItem(item, delivery._id, decoded, session, fromSalesOrder);
    }

    // Update linked Sales Order delivered quantities and status
    if (fromSalesOrder && deliveryData.salesOrderId) {
      const salesOrder = await SalesOrder.findOne({ _id: deliveryData.salesOrderId, companyId: decoded.companyId }).session(session);
      if (salesOrder) {
        let anyDelivered = false;
        let allDelivered = true;
        for (const deliveredItem of deliveryData.items) {
          const soItem = salesOrder.items.find(it => it.item.toString() === deliveredItem.item.toString());
          if (soItem) {
            soItem.deliveredQuantity = (soItem.deliveredQuantity || 0) + deliveredItem.quantity;
            const remaining = (soItem.quantity || 0) - soItem.deliveredQuantity;
            if (remaining > 0) allDelivered = false;
            anyDelivered = true;
            console.log(`SO item ${soItem.itemCode}: delivered=${soItem.deliveredQuantity}, remaining=${remaining}`);
          }
        }
        if (allDelivered && anyDelivered) {
          salesOrder.status = "Fully Delivered";
        } else if (anyDelivered) {
          salesOrder.status = "Partially Delivered";
        }
        await salesOrder.save({ session });
        console.log(`✅ SalesOrder ${salesOrder._id} status updated to ${salesOrder.status}`);
      }
    }

    await session.commitTransaction();
    committed = true;
    session.endSession();

    const populatedDelivery = await Delivery.findById(delivery._id)
      .populate("customer", "customerCode customerName")
      .populate("items.item", "itemCode itemName imageUrl variants")
      .populate("items.warehouse", "warehouseName warehouseCode");

    return NextResponse.json({ success: true, message: "Delivery created", data: populatedDelivery }, { status: 201 });
  } catch (error) {
    if (session && !committed) await session.abortTransaction();
    if (session) await session.endSession();
    console.error("POST delivery error:", error);
    const status = error.message.toLowerCase().includes("stock") ? 422 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

// ──────────────────────────────────────────────────────────────
// GET – List deliveries (with pagination)
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
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");

    if (id && Types.ObjectId.isValid(id)) {
      const delivery = await Delivery.findOne({ _id: id, companyId: decoded.companyId })
        .populate("customer", "customerCode customerName")
        .populate("items.item", "itemCode itemName imageUrl variants")
        .populate("items.warehouse", "warehouseName warehouseCode");
      if (!delivery) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: delivery });
    }

    const query = { companyId: decoded.companyId };
    if (status && status !== "All") query.status = status;
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { documentNumberDelivery: { $regex: search, $options: "i" } },
        { refNumber: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [deliveries, total] = await Promise.all([
      Delivery.find(query)
        .populate("customer", "customerCode customerName")
        .populate("items.item", "itemCode itemName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Delivery.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: deliveries,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET delivery error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────
// PUT – Update delivery (no stock changes)
// ──────────────────────────────────────────────────────────────
export async function PUT(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  let committed = false;

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

    const { fields, files } = await parseMultipart(req);
    const deliveryData = JSON.parse(fields.deliveryData || "{}");

    const existing = await Delivery.findOne({ _id: id, companyId: decoded.companyId }).session(session);
    if (!existing) throw new Error("Delivery not found");

    const removedPublicIds = deliveryData.removedFiles?.map(f => f.publicId) || [];
    const existingFiles = deliveryData.existingFiles || [];
    for (const pubId of removedPublicIds) {
      await cloudinary.uploader.destroy(pubId).catch(e => console.warn(e));
    }
    const fileArray = Array.isArray(files.attachments) ? files.attachments : files.attachments ? [files.attachments] : [];
    const uploadedFiles = [];
    for (const file of fileArray) {
      if (!file?.filepath) continue;
      const result = await cloudinary.uploader.upload(file.filepath, {
        folder: "deliveries",
        resource_type: "auto",
      });
      uploadedFiles.push({
        fileName: file.originalFilename,
        fileUrl: result.secure_url,
        fileType: file.mimetype,
        uploadedAt: new Date(),
        publicId: result.public_id,
      });
    }

    const updatePayload = {
      status: deliveryData.status,
      remarks: deliveryData.remarks,
      deliveryDate: deliveryData.deliveryDate,
      expectedDeliveryDate: deliveryData.expectedDeliveryDate,
      attachments: [
        ...existingFiles.filter(f => !removedPublicIds.includes(f.publicId)),
        ...uploadedFiles,
      ],
      updatedAt: new Date(),
    };

    const updated = await Delivery.findByIdAndUpdate(id, updatePayload, { new: true, session });
    await session.commitTransaction();
    committed = true;
    session.endSession();

    return NextResponse.json({ success: true, message: "Delivery updated", data: updated });
  } catch (error) {
    if (session && !committed) await session.abortTransaction();
    if (session) await session.endSession();
    console.error("PUT delivery error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────
// DELETE – Cancel delivery (restore stock)
// ──────────────────────────────────────────────────────────────
export async function DELETE(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  let committed = false;

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

    const delivery = await Delivery.findOne({ _id: id, companyId: decoded.companyId }).session(session);
    if (!delivery) throw new Error("Delivery not found");
    const fromSalesOrder = !!delivery.salesOrderId;

    for (const item of delivery.items) {
      const warehouse = await Warehouse.findById(item.warehouse).session(session);
      if (!warehouse) continue;
      const useBins = warehouse.binLocations?.length > 0;
      const variantId = item.variant?.variantId || item.selectedVariantId;
      const query = {
        companyId: new Types.ObjectId(decoded.companyId),
        item: new Types.ObjectId(item.item),
        warehouse: new Types.ObjectId(item.warehouse),
      };
      if (useBins && item.selectedBin) {
        query.bin = new Types.ObjectId(item.selectedBin);
      } else {
        query.bin = { $in: [null, undefined] };
      }
      const inventory = await Inventory.findOne(query).session(session);
      if (inventory) {
        if (variantId) {
          let variantInv = inventory.variantInventory.find(v => v.variantId.toString() === variantId.toString());
          if (variantInv) {
            variantInv.quantity += item.quantity;
            if (fromSalesOrder) variantInv.committed = (variantInv.committed || 0) + item.quantity;
          }
        } else {
          inventory.quantity += item.quantity;
          if (fromSalesOrder) inventory.committed = (inventory.committed || 0) + item.quantity;
        }
        await inventory.save({ session });
      }
    }

    if (delivery.attachments?.length) {
      const publicIds = delivery.attachments.map(a => a.publicId).filter(Boolean);
      for (const pubId of publicIds) {
        await cloudinary.uploader.destroy(pubId).catch(e => console.warn(e));
      }
    }

    await Delivery.deleteOne({ _id: id, companyId: decoded.companyId }).session(session);
    await session.commitTransaction();
    committed = true;
    session.endSession();

    return NextResponse.json({ success: true, message: "Delivery deleted and stock restored" });
  } catch (error) {
    if (session && !committed) await session.abortTransaction();
    if (session) await session.endSession();
    console.error("DELETE delivery error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}




// export async function GET(req) {
//   await dbConnect();
//   try {
//     const token = getTokenFromHeader(req);
//     const user = await verifyJWT(token);
//     if (!user || (user.type === 'user' && !['Admin', 'Sales Manager'].includes(user.role))) {
//       return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
//     }
//     const salesOrders = await Delivery.find({ companyId: user.companyId });
//     return NextResponse.json({ success: true, data: salesOrders }, { status: 200 });
//   } catch (err) {
//     console.error("❌ Error fetching sales orders:", err.message);
//     return NextResponse.json({ success: false, message: err.message }, { status: 500 });
//   }
// }




// import mongoose from "mongoose";
// import dbConnect from "@/lib/db";
// import Delivery from "../../../models/deliveryModels";
// import SalesOrder from "@/models/SalesOrder";
// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";
// import Counter from "@/models/Counter";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// const { Types } = mongoose;

// export async function POST(req) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) {
//       throw new Error("Unauthorized: No token provided");
//     }

//     const decoded = verifyJWT(token);
//     if (!decoded || !decoded.companyId) {
//       throw new Error("Invalid token payload: Missing companyId");
//     }

//     const deliveryData = await req.json();
//     console.log("Received Delivery Data:", deliveryData);

//     // Data Cleaning
//     delete deliveryData._id;
//     if (Array.isArray(deliveryData.items)) {
//       deliveryData.items = deliveryData.items.map((item) => {
//         delete item._id;
//         return item;
//       });
//     }

//     deliveryData.companyId = decoded.companyId;

//     // Generate document number per company per year
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
//     const key = "Sales Delivery";

//     let counter = await Counter.findOne({ id: key, companyId: decoded.companyId }).session(session);

//     if (!counter) {
//       const [created] = await Counter.create(
//         [{ id: key, companyId: decoded.companyId, seq: 1 }],
//         { session }
//       );
//       counter = created;
//     } else {
//       counter.seq += 1;
//       await counter.save({ session });
//     }

//     const paddedSeq = String(counter.seq).padStart(5, "0");
//     deliveryData.documentNumberDelivery = `SALES-DEL/${financialYear}/${paddedSeq}`;

//     // Create Delivery
//     const [delivery] = await Delivery.create([deliveryData], { session });
//     console.log("Delivery created with _id:", delivery._id);

//     const isCopiedSO = !!deliveryData.salesOrderId;

//     async function processItem(item) {
//       const inventoryDoc = await Inventory.findOne({
//         item: new Types.ObjectId(item.item),
//         warehouse: new Types.ObjectId(item.warehouse),
//       }).session(session);

//       if (!inventoryDoc) {
//         throw new Error(
//           `No inventory record found for item ${item.item} in warehouse ${item.warehouse}`
//         );
//       }

//       if (item.batches && item.batches.length > 0) {
//         for (const allocated of item.batches) {
//           const batchIndex = inventoryDoc.batches.findIndex(
//             (b) => b.batchNumber === allocated.batchCode
//           );
//           if (batchIndex === -1) {
//             throw new Error(
//               `Batch ${allocated.batchCode} not found for item ${item.item}`
//             );
//           }

//           if (isCopiedSO) {
//             inventoryDoc.committed -= allocated.allocatedQuantity;
//           } else {
//             if (inventoryDoc.batches[batchIndex].quantity < allocated.allocatedQuantity) {
//               throw new Error(
//                 `Insufficient stock in batch ${allocated.batchCode} for item ${item.item}`
//               );
//             }
//             inventoryDoc.batches[batchIndex].quantity -= allocated.allocatedQuantity;
//             inventoryDoc.quantity -= allocated.allocatedQuantity;
//           }
//         }
//       } else {
//         if (isCopiedSO) {
//           inventoryDoc.committed -= item.quantity;
//         } else {
//           if (inventoryDoc.quantity < item.quantity) {
//             throw new Error(
//               `Insufficient stock for item ${item.item} in warehouse ${item.warehouse}`
//             );
//           }
//           inventoryDoc.quantity -= item.quantity;
//         }
//       }

//       await StockMovement.create(
//         [
//           {
//             item: item.item,
//             warehouse: item.warehouse,
//             movementType: "OUT",
//             quantity: item.quantity,
//             reference: delivery._id,
//             remarks: isCopiedSO
//               ? "Delivery from SO copy – committed reduced"
//               : "Normal Delivery – stock reduction",
//             companyId: decoded.companyId,
//           },
//         ],
//         { session }
//       );

//       await inventoryDoc.save({ session });
//     }

//     for (const item of deliveryData.items) {
//       await processItem(item);
//     }

//     // Close Sales Order if copied from one
//     // if (isCopiedSO) {
//     //   await SalesOrder.findByIdAndUpdate(
//     //     deliveryData.salesOrderId,
//     //     { status: "Close" },
//     //     { session }
//     //   );
//     //   console.log(`Sales Order ${deliveryData.salesOrderId} updated to Close`);
//     // }

//     if (isCopiedSO) {
//   // Fetch the sales order with items
//   const so = await SalesOrder.findById(deliveryData.salesOrderId).session(session);

//   if (!so) throw new Error("Sales Order not found");

//   // Check if all items are fully delivered
//   let allDelivered = true;

//   for (const item of so.items) {
//     const deliveredQty = deliveryData.items.find(i => i.item.toString() === item.item.toString())?.deliveredQuantity || 0;

//     if (deliveredQty < item.quantity) {
//       allDelivered = false;
//       break;
//     }
//   }

//   // Update status based on delivery
//   so.status = allDelivered ? "Complete" : "Partially Complete";

//   await so.save({ session });

//   console.log(`Sales Order ${so._id} updated to ${so.status}`);
// }





//     await session.commitTransaction();
//     return new Response(
//       JSON.stringify({
//         message: "Delivery processed and inventory updated",
//         deliveryId: delivery._id,
//       }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     if (session.inTransaction()) {
//       await session.abortTransaction();
//     }
//     console.error("Error processing Delivery:", error.stack || error);
//     return new Response(
//       JSON.stringify({
//         message: "Error processing Delivery",
//         error: error.message,
//       }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   } finally {
//     session.endSession();
//   }
// }


// export async function GET(req) {
//   await dbConnect();
//   try {
//     const token = getTokenFromHeader(req);
//     const user = await verifyJWT(token);
//     if (!user || (user.type === 'user' && !['Admin', 'Sales Manager'].includes(user.role))) {
//       return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
//     }
//     const salesOrders = await Delivery.find({ companyId: user.companyId });
//     return NextResponse.json({ success: true, data: salesOrders }, { status: 200 });
//   } catch (err) {
//     console.error("❌ Error fetching sales orders:", err.message);
//     return NextResponse.json({ success: false, message: err.message }, { status: 500 });
//   }
// }




