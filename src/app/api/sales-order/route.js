import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import formidable from 'formidable';
import { Readable } from 'stream';
import dbConnect from '@/lib/db';
import SalesOrder from '@/models/SalesOrder';
import Inventory from '@/models/Inventory';
import StockMovement from '@/models/StockMovement';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';
import Counter from '@/models/Counter';
import Customer from '@/models/CustomerModel';
import Item from '@/models/ItemModels';
import Warehouse from '@/models/warehouseModels';



export const config = { api: { bodyParser: false } };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const { Types } = mongoose;

// ──────────────────────────────────────────────────────────────
// Permission helper
// ──────────────────────────────────────────────────────────────
function hasPermission(user, moduleName, action = "view") {
  if (!user) return false;
  if (user.type === "company") return true;
  if (user.roles?.includes("Admin")) return true;
  const module = user.modules?.[moduleName];
  if (!module || !module.selected) return false;
  return module.permissions?.[action] === true;
}

// ──────────────────────────────────────────────────────────────
// Parse multipart/form-data
// ──────────────────────────────────────────────────────────────
async function toNodeReq(request) {
  const buf = Buffer.from(await request.arrayBuffer());
  const nodeReq = new Readable({
    read() { this.push(buf); this.push(null); }
  });
  nodeReq.headers = Object.fromEntries(request.headers.entries());
  nodeReq.method = request.method;
  nodeReq.url = request.url || "/";
  return nodeReq;
}

async function parseMultipart(request) {
  const nodeReq = await toNodeReq(request);
  const form = formidable({ multiples: true, keepExtensions: true });
  return new Promise((res, rej) =>
    form.parse(nodeReq, (err, fields, files) =>
      err ? rej(err) : res({ fields, files })
    )
  );
}

// ──────────────────────────────────────────────────────────────
// POST – Create Sales Order (reserve stock, no physical change)
// ──────────────────────────────────────────────────────────────
export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  let committed = false;

  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("JWT token missing");

    const user = verifyJWT(token);
    if (!hasPermission(user, "Sales Order", "create")) {
      throw new Error("Forbidden");
    }

    const { fields, files } = await parseMultipart(req);
    const orderData = JSON.parse(fields.orderData || "{}");

    delete orderData._id;
    orderData.items?.forEach(i => delete i._id);
    delete orderData.billingAddress?._id;
    delete orderData.shippingAddress?._id;

    orderData.companyId = user.companyId;
    if (user.type === 'user') orderData.createdBy = user.id;

    // Handle file uploads
    const fileArray = Array.isArray(files.newFiles) ? files.newFiles : files.newFiles ? [files.newFiles] : [];
    const uploadedFiles = await Promise.all(
      fileArray.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.filepath, {
          folder: 'sales_orders',
          resource_type: 'auto',
        });
        return {
          fileName: file.originalFilename,
          fileUrl: result.secure_url,
          fileType: file.mimetype,
          uploadedAt: new Date(),
          publicId: result.public_id,
        };
      })
    );
    orderData.attachments = [...(orderData.attachments || []), ...uploadedFiles];

    // Generate document number
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    let fyStart = currentYear, fyEnd = currentYear + 1;
    if (currentMonth < 4) { fyStart = currentYear - 1; fyEnd = currentYear; }
    const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
    const key = "SalesOrder";

    let counter = await Counter.findOne({ id: key, companyId: user.companyId }).session(session);
    if (!counter) {
      const [created] = await Counter.create([{ id: key, companyId: user.companyId, seq: 1 }], { session });
      counter = created;
    } else {
      counter.seq += 1;
      await counter.save({ session });
    }
    orderData.documentNumberOrder = `SALES-ORD/${financialYear}/${String(counter.seq).padStart(5, "0")}`;

    const [order] = await SalesOrder.create([orderData], { session });

    // Process each item: reserve stock (increment committed) for variant or normal item
    for (const item of orderData.items) {
      const itemId = item.item?._id || item.item;
      const warehouseId = item.warehouse?._id || item.warehouse;
      const variantId = item.variant?.variantId || item.selectedVariantId;

      if (!itemId || !warehouseId) {
        throw new Error(`Invalid item or warehouse ID for ${item.itemCode || 'unknown'}`);
      }

      // Find or create inventory record
      let inventory = await Inventory.findOne({
        companyId: user.companyId,
        item: new Types.ObjectId(itemId),
        warehouse: new Types.ObjectId(warehouseId),
      }).session(session);

      if (!inventory) {
        inventory = new Inventory({
          companyId: user.companyId,
          item: new Types.ObjectId(itemId),
          warehouse: new Types.ObjectId(warehouseId),
          quantity: 0,
          committed: 0,
          onOrder: 0,
          hasVariants: !!variantId,
          variantInventory: [],
        });
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
            batches: [],
          };
          inventory.variantInventory.push(variantInv);
        }
        variantInv.committed = (variantInv.committed || 0) + item.quantity;
      } else {
        inventory.committed = (inventory.committed || 0) + item.quantity;
      }

      await inventory.save({ session });

      // Log stock movement (reservation)
      await StockMovement.create([{
        companyId: user.companyId,
        createdBy: user.id,
        item: new Types.ObjectId(itemId),
        variantId: variantId ? new Types.ObjectId(variantId) : null,
        warehouse: new Types.ObjectId(warehouseId),
        movementType: "RESERVE",
        quantity: item.quantity,
        reference: order._id,
        referenceType: "SalesOrder",
        remarks: `Stock reserved for Sales Order ${order.documentNumberOrder}`,
        date: new Date(),
      }], { session });
    }

    await session.commitTransaction();
    committed = true;
    session.endSession();

    return NextResponse.json({ success: true, message: 'Sales order created', orderId: order._id }, { status: 201 });
  } catch (err) {
    if (!committed) await session.abortTransaction();
    session.endSession();
    console.error("❌ Error creating sales order:", err.message);
    const status = /Forbidden|Unauthorized|JWT/.test(err.message) ? 401 : 500;
    return NextResponse.json({ success: false, message: err.message }, { status });
  }
}

// ──────────────────────────────────────────────────────────────
// GET – List or single Sales Order
// ──────────────────────────────────────────────────────────────
export async function GET(req) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    const user = verifyJWT(token);
    if (!hasPermission(user, "Sales Order", "view")) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");

    // Single order by ID
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      const order = await SalesOrder.findOne({ _id: id, companyId: user.companyId })
        .populate("customer", "customerCode customerName contactPerson")
        .populate("items.item", "itemCode itemName unitPrice imageUrl variants")
        .populate("items.warehouse", "warehouseName warehouseCode");
      if (!order) {
        return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: order });
    }

    // Build query for list
    const query = { companyId: user.companyId };
    
    // ✅ FILTER BY STATUS
    if (status && status !== "All" && status !== "") {
      query.status = status;
    }

    // Search filter
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { documentNumberOrder: { $regex: search, $options: "i" } },
        { refNumber: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      SalesOrder.find(query)
        .populate("customer", "customerCode customerName")
        .populate("items.item", "itemCode itemName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SalesOrder.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: orders,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("GET error:", err.message);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────
// PUT – Update Sales Order (only allowed for open orders, no stock change)
// ──────────────────────────────────────────────────────────────
export async function PUT(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  let committed = false;

  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized");
    const user = verifyJWT(token);
    if (!hasPermission(user, "Sales Order", "update")) throw new Error("Forbidden");

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Valid ID required" }, { status: 400 });
    }

    const { fields, files } = await parseMultipart(req);
    const orderData = JSON.parse(fields.orderData || "{}");

    const existing = await SalesOrder.findOne({ _id: id, companyId: user.companyId }).session(session);
    if (!existing) throw new Error("Order not found");
    if (existing.status === "Closed" || existing.status === "Cancelled") {
      throw new Error("Cannot update closed/cancelled order");
    }

    // Update only allowed fields (simplified – you may merge carefully)
    // For simplicity, we only update status, remarks, attachments.
    // To update items, you'd need to recompute reserved stock, which is complex.
    // So we restrict updates to meta fields.
    const updatePayload = {
      status: orderData.status,
      remarks: orderData.remarks,
      updatedAt: new Date(),
    };

    // Handle attachments (similar to POST)
    const removedPublicIds = orderData.removedFiles?.map(f => f.publicId) || [];
    const existingFiles = orderData.existingFiles || [];

    for (const publicId of removedPublicIds) {
      await cloudinary.uploader.destroy(publicId).catch(e => console.warn(e));
    }

    const fileArray = Array.isArray(files.newFiles) ? files.newFiles : files.newFiles ? [files.newFiles] : [];
    const uploadedFiles = await Promise.all(
      fileArray.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.filepath, {
          folder: 'sales_orders',
          resource_type: 'auto',
        });
        return {
          fileName: file.originalFilename,
          fileUrl: result.secure_url,
          fileType: file.mimetype,
          uploadedAt: new Date(),
          publicId: result.public_id,
        };
      })
    );

    updatePayload.attachments = [
      ...existingFiles.filter(f => !removedPublicIds.includes(f.publicId)),
      ...uploadedFiles,
    ];

    const updated = await SalesOrder.findByIdAndUpdate(id, updatePayload, { new: true, session });
    await session.commitTransaction();
    committed = true;
    session.endSession();

    return NextResponse.json({ success: true, message: "Order updated", data: updated });
  } catch (err) {
    if (!committed) await session.abortTransaction();
    session.endSession();
    console.error("PUT error:", err.message);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────
// DELETE – Cancel Sales Order (release reserved stock)
// ──────────────────────────────────────────────────────────────
export async function DELETE(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  let committed = false;

  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized");
    const user = verifyJWT(token);
    if (!hasPermission(user, "Sales Order", "delete")) throw new Error("Forbidden");

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Valid ID required" }, { status: 400 });
    }

    const order = await SalesOrder.findOne({ _id: id, companyId: user.companyId }).session(session);
    if (!order) throw new Error("Order not found");
    if (order.status === "Closed" || order.status === "Cancelled") {
      throw new Error("Order already closed/cancelled");
    }

    // Release reserved stock for each item
    for (const item of order.items) {
      const itemId = item.item?._id || item.item;
      const warehouseId = item.warehouse?._id || item.warehouse;
      const variantId = item.variant?.variantId || item.selectedVariantId;

      if (!itemId || !warehouseId) continue;

      let inventory = await Inventory.findOne({
        companyId: user.companyId,
        item: new Types.ObjectId(itemId),
        warehouse: new Types.ObjectId(warehouseId),
      }).session(session);

      if (inventory) {
        if (variantId) {
          const variantInv = inventory.variantInventory.find(v => v.variantId.toString() === variantId.toString());
          if (variantInv) variantInv.committed = Math.max(0, (variantInv.committed || 0) - item.quantity);
        } else {
          inventory.committed = Math.max(0, (inventory.committed || 0) - item.quantity);
        }
        await inventory.save({ session });
      }
    }

    // Delete attachments from Cloudinary
    if (order.attachments?.length) {
      const publicIds = order.attachments.map(a => a.publicId).filter(Boolean);
      for (const pubId of publicIds) {
        await cloudinary.uploader.destroy(pubId).catch(e => console.warn(e));
      }
    }

    await SalesOrder.deleteOne({ _id: id }).session(session);
    await session.commitTransaction();
    committed = true;
    session.endSession();

    return NextResponse.json({ success: true, message: "Order deleted and stock released" });
  } catch (err) {
    if (!committed) await session.abortTransaction();
    session.endSession();
    console.error("DELETE error:", err.message);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}






// import { NextResponse } from 'next/server';
// import mongoose from 'mongoose';
// import formidable from 'formidable';
// import { Readable } from 'stream';
// import dbConnect from '@/lib/db';
// import SalesOrder from '@/models/SalesOrder';
// import Inventory from '@/models/Inventory';
// import StockMovement from '@/models/StockMovement';
// import { getTokenFromHeader, verifyJWT } from '@/lib/auth';
// import { v2 as cloudinary } from 'cloudinary';
// import Counter from '@/models/Counter';

// export const config = { api: { bodyParser: false } };

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const { Types } = mongoose;

// function hasPermission(user, moduleName, action = "view") {

//   if (!user) return false;

//   // company full access
//   if (user.type === "company") return true;

//   // admin full access
//   if (user.roles?.includes("Admin")) return true;

//   const module = user.modules?.[moduleName];

//   if (!module || !module.selected) return false;

//   return module.permissions?.[action] === true;
// }

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
//     form.parse(nodeReq, (err, fields, files) =>
//       err ? rej(err) : res({ fields, files })
//     )
//   );
// }

// export async function POST(req) {
//   await dbConnect();
//   const mongoSession = await mongoose.startSession();
//   mongoSession.startTransaction();

//   try {
//     const token =  getTokenFromHeader(req);
//     if (!token) throw new Error("JWT token missing");

//     const user =  verifyJWT(token);
//     console.log("Decoded User:", user);
//     if (!hasPermission(user, "Sales Order", "create")) {
//   throw new Error("Forbidden");
// }

//     const { fields, files } = await parseMultipart(req);
//     const orderData = JSON.parse(fields.orderData || "{}");

//     delete orderData._id;
//     orderData.items?.forEach(i => delete i._id);
//     delete orderData.billingAddress?._id;
//     delete orderData.shippingAddress?._id;

//     orderData.companyId = user.companyId;
//     if (user.type === 'user') orderData.createdBy = user.id;

//     const fileArray = Array.isArray(files.newFiles) ? files.newFiles : files.newFiles ? [files.newFiles] : [];
//     const uploadedFiles = await Promise.all(
//       fileArray.map(async (file) => {
//         const result = await cloudinary.uploader.upload(file.filepath, {
//           folder: 'sales_orders',
//           resource_type: 'auto',
//         });
//         return {
//           fileName: file.originalFilename,
//           fileUrl: result.secure_url,
//           fileType: file.mimetype,
//           uploadedAt: new Date(),
//         };
//       })
//     );
//     orderData.attachments = [...(orderData.attachments || []), ...uploadedFiles];

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
//     const key = "SalesOrder";

//     let counter = await Counter.findOne({ id: key, companyId: user.companyId }).session(mongoSession);
//     if (!counter) {
//       const [created] = await Counter.create([{ id: key, companyId: user.companyId, seq: 1 }], { session: mongoSession });
//       counter = created;
//     } else {
//       counter.seq += 1;
//       await counter.save({ session: mongoSession });
//     }

//     const paddedSeq = String(counter.seq).padStart(5, "0");
//     orderData.documentNumberOrder = `SALES-ORD/${financialYear}/${paddedSeq}`;

//     const [order] = await SalesOrder.create([orderData], { session: mongoSession });

// for (const item of orderData.items) {
//   const itemId = item.item?._id || item.item;
//   const warehouseId = item.warehouse?._id || item.warehouse;

//   if (!itemId || !warehouseId || !Types.ObjectId.isValid(itemId) || !Types.ObjectId.isValid(warehouseId)) {
//     throw new Error(`Invalid Item or Warehouse ID: ${itemId}, ${warehouseId}`);
//   }

//   const itemObjId = new Types.ObjectId(itemId);
//   const warehouseObjId = new Types.ObjectId(warehouseId);

//   // Ensure Inventory record exists but don't check stock
//   let inv = await Inventory.findOne({
//     companyId: user.companyId,
//     item: itemObjId,
//     warehouse: warehouseObjId
//   }).session(mongoSession);

//   if (!inv) {
//     [inv] = await Inventory.create(
//       [{
//         companyId: user.companyId,
//         item: itemObjId,
//         warehouse: warehouseObjId,
//         quantity: 0,
//         committed: 0,
//         batches: []
//       }],
//       { session: mongoSession }
//     );
//   }

//   // ❌ REMOVE stock validation
//   // ❌ REMOVE batch-level checks
//   // ❌ REMOVE insufficient stock error

//   // Option A: If you want to "reserve" stock, just increment committed
//   // Option B: If you don’t even want reservation, skip this
//   inv.committed = (inv.committed || 0) + item.quantity;
//   await inv.save({ session: mongoSession });

//   await StockMovement.create([{
//     companyId: user.companyId,
//     item: itemObjId,
//     warehouse: warehouseObjId,
//     movementType: 'RESERVE', // or remove this if you don’t want reservation
//     quantity: item.quantity,
//     reference: order._id,
//     remarks: 'Sales Order reservation',
//   }], { session: mongoSession });
// }


//     await mongoSession.commitTransaction();
//     mongoSession.endSession();

//     return NextResponse.json({ success: true, message: 'Sales order created', orderId: order._id }, { status: 201 });
//   } catch (err) {
//     await mongoSession.abortTransaction();
//     mongoSession.endSession();
//     console.error("❌ Error creating sales order:", err.message);
//     const code = /Forbidden|Unauthorized|JWT/.test(err.message) ? 401 : 500;
//     return NextResponse.json({ success: false, message: err.message }, { status: code });
//   }
// }

// // ✅ GET Route
// export async function GET(req) {
//   await dbConnect();
//   try {
//     const token = getTokenFromHeader(req);
//     const user = await verifyJWT(token);
//   if (!hasPermission(user, "Sales Order", "view")) {
//   return NextResponse.json(
//     { success: false, message: "Unauthorized" },
//     { status: 401 }
//   );
// }
//     const salesOrders = await SalesOrder.find({ companyId: user.companyId });
//     return NextResponse.json({ success: true, data: salesOrders }, { status: 200 });
//   } catch (err) {
//     console.error("❌ Error fetching sales orders:", err.message);
//     return NextResponse.json({ success: false, message: err.message }, { status: 500 });
//   }
// }

