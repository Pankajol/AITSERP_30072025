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

export const config = { api: { bodyParser: false } };

// ✅ Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const { Types } = mongoose;

// ✅ Authorization Check
function isAuthorized(user) {
  if (user.type === 'company') return true;
  if (user.role === 'Sales Manager' || user.role === 'Admin') return true;
  return user.permissions?.includes('sales');
}

// ✅ Convert Next.js request to Node.js stream for formidable
async function toNodeReq(request) {
  const buf = Buffer.from(await request.arrayBuffer());
  const nodeReq = new Readable({
    read() {
      this.push(buf);
      this.push(null);
    },
  });
  nodeReq.headers = Object.fromEntries(request.headers.entries());
  nodeReq.method = request.method;
  nodeReq.url = request.url || "/";
  return nodeReq;
}

// ✅ Parse multipart form data
async function parseMultipart(request) {
  const nodeReq = await toNodeReq(request);
  const form = formidable({ multiples: true, keepExtensions: true });
  return await new Promise((res, rej) =>
    form.parse(nodeReq, (err, fields, files) =>
      err ? rej(err) : res({ fields, files })
    )
  );
}

export async function POST(req) {
  await dbConnect();
  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  try {
    /* 1 — Auth */
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("JWT token missing");

    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user)) throw new Error('Forbidden');

    /* 2 — Parse multipart form */
    const { fields, files } = await parseMultipart(req);
    const orderData = JSON.parse(fields.orderData || "{}");

    // Clean old IDs
    delete orderData._id;
    orderData.items?.forEach(i => delete i._id);
    delete orderData.billingAddress?._id;
    delete orderData.shippingAddress?._id;

    /* 3 — Tenant info */
    orderData.companyId = user.companyId;
    if (user.type === 'user') orderData.createdBy = user.id;

    /* 4 — Handle attachments */
    const fileArray = Array.isArray(files.newFiles)
      ? files.newFiles
      : files.newFiles
      ? [files.newFiles]
      : [];

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
        };
      })
    );

    orderData.attachments = [
      ...(orderData.attachments || []),
      ...uploadedFiles,
    ];

    /* 5 — Create order */
    const [order] = await SalesOrder.create([orderData], { session: mongoSession });

    /* 6 — Reserve inventory with Auto-Create */
    for (const item of orderData.items) {
      const itemId = item.item?._id || item.item;
      const warehouseId = item.warehouse?._id || item.warehouse;

      if (!itemId || !warehouseId || !Types.ObjectId.isValid(itemId) || !Types.ObjectId.isValid(warehouseId)) {
        throw new Error(`Invalid Item or Warehouse ID: ${itemId}, ${warehouseId}`);
      }

      const itemObjId = new Types.ObjectId(itemId);
      const warehouseObjId = new Types.ObjectId(warehouseId);

      let inv = await Inventory.findOne({ item: itemObjId, warehouse: warehouseObjId }).session(mongoSession);

      if (!inv) {
        [inv] = await Inventory.create(
          [
            {
              item: itemObjId,
              warehouse: warehouseObjId,
              quantity: 0,
              committed: 0,
              batches: [],
            },
          ],
          { session: mongoSession }
        );
        console.log(`✅ Created inventory for item ${itemId} in warehouse ${warehouseId}`);
      }

      // Validate stock
      if (item.batches?.length) {
        for (const alloc of item.batches) {
          const idx = inv.batches.findIndex(b => b.batchNumber === alloc.batchCode);
          if (idx === -1) throw new Error(`Batch ${alloc.batchCode} not found`);
          if (inv.batches[idx].quantity < alloc.allocatedQuantity)
            throw new Error(`Insufficient quantity in batch ${alloc.batchCode}`);
        }
      } else if (inv.quantity < item.quantity) {
        throw new Error(`Insufficient stock for item ${itemId}`);
      }

      // Reserve inventory
      inv.committed = (inv.committed || 0) + item.quantity;
      await inv.save({ session: mongoSession });

      await StockMovement.create(
        [
          {
            companyId: user.companyId,
            item: itemObjId,
            warehouse: warehouseObjId,
            movementType: 'RESERVE',
            quantity: item.quantity,
            reference: order._id,
            remarks: 'Sales Order reservation',
          },
        ],
        { session: mongoSession }
      );
    }

    await mongoSession.commitTransaction();
    mongoSession.endSession();

    return NextResponse.json({ success: true, message: 'Sales order created', orderId: order._id }, { status: 201 });
  } catch (err) {
    await mongoSession.abortTransaction();
    mongoSession.endSession();
    console.error("❌ Error creating sales order:", err.message);
    const code = /Forbidden|Unauthorized|JWT/.test(err.message) ? 401 : 500;
    return NextResponse.json({ success: false, message: err.message }, { status: code });
  }
}

// ✅ GET Route
export async function GET(req) {
  await dbConnect();
  try {
    const token = getTokenFromHeader(req);
    const user = await verifyJWT(token);
    if (!user || (user.type === 'user' && !['Admin', 'Sales Manager'].includes(user.role))) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const salesOrders = await SalesOrder.find({ companyId: user.companyId });
    return NextResponse.json({ success: true, data: salesOrders }, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching sales orders:", err.message);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}



// // app/api/sales-orders/route.js
// import { NextResponse } from 'next/server';
// import mongoose from 'mongoose';
// import dbConnect from '@/lib/db';
// import SalesOrder from '@/models/SalesOrder';
// import Inventory from '@/models/Inventory';
// import StockMovement from '@/models/StockMovement';
// import { getTokenFromHeader, verifyJWT } from '@/lib/auth';
// // import { sendSalesOrderEmail } from "@/lib/mailer";

// const { Types } = mongoose;

// /* -------------------------------------------------
//    Helper: only company token OR user w/ "sales" perm
// -------------------------------------------------- */
// // function isAuthorized(user) {
// //   return user.type === 'company' || user.permissions?.includes('sales');
// // }
// function isAuthorized(user) {
//   if (user.type === 'company') return true;
//   if (user.role === 'Sales Manager' || user.role === 'Admin') return true;
//   return user.permissions?.includes('sales');
// }

// /* =================================================
//    POST  /api/sales-orders   (create + reserve stock)
// =================================================== */
// export async function POST(req) {
//   await dbConnect();
//   const mongoSession = await mongoose.startSession();
//   mongoSession.startTransaction();

//   try {
//     /* 1 — Auth ------------------------------------------------ */
//     const token = getTokenFromHeader(req);
//     const user  = await verifyJWT(token);
//     if (!user || !isAuthorized(user)) throw new Error('Forbidden');

//     /* 2 — Parse body / clean IDs ----------------------------- */
//     const orderData = await req.json();
//     delete orderData._id;
//     orderData.items?.forEach(i => delete i._id);
//     delete orderData.billingAddress?._id;
//     delete orderData.shippingAddress?._id;

//     /* 3 — Inject tenant metadata ---------------------------- */
//     orderData.companyId = user.companyId;       // ✅ always present on token
//     if (user.type === 'user') orderData.createdBy = user.id;

//     /* 4 — Create order -------------------------------------- */
//     const [order] = await SalesOrder.create([orderData], { session: mongoSession });

// await sendSalesOrderEmail(
//   ["aniketgaikwad7224@gmail.com", "9to5withnikhil@gmail.com", "cp5553135@gmail.com", "pritammore1001@gmail.com"],
//   order
// );

//     /* 5 — Reserve inventory for each item ------------------- */
//     for (const item of orderData.items) {
//       const inv = await Inventory.findOne({
//         // companyId: user.companyId,                // ✅ tenant‑scoped
//         item:      new Types.ObjectId(item.item),
//         warehouse: new Types.ObjectId(item.warehouse),
//       }).session(mongoSession);

//       if (!inv) throw new Error(`No inventory for item ${item.item}`);

//       /* batch vs. non‑batch checks */
//       if (item.batches?.length) {
//         for (const alloc of item.batches) {
//           const idx = inv.batches.findIndex(b => b.batchNumber === alloc.batchCode);
//           if (idx === -1) throw new Error(`Batch ${alloc.batchCode} not found`);
//           if (inv.batches[idx].quantity < alloc.allocatedQuantity)
//             throw new Error(`Insufficient quantity in batch ${alloc.batchCode}`);
//         }
//       } else if (inv.quantity < item.quantity) {
//         throw new Error(`Insufficient stock for item ${item.item}`);
//       }
    
//       /* commit stock */
//       inv.committed = (inv.committed || 0) + item.quantity;
//       await inv.save({ session: mongoSession });

//       /* stock‑movement log */
//       await StockMovement.create(
//         [{
//           companyId: user.companyId,
//           item: item.item,
//           warehouse: item.warehouse,
//           movementType: 'RESERVE',
//           quantity: item.quantity,
//           reference: order._id,
//           remarks: 'Sales Order reservation',
//         }],
//         { session: mongoSession }
//       );
//     }

//     await mongoSession.commitTransaction();
//     mongoSession.endSession();

//     return NextResponse.json(
//       { success: true, message: 'Sales order created', orderId: order._id },
//       { status: 201 }
//     );
//   } catch (err) {
//     await mongoSession.abortTransaction();
//     mongoSession.endSession();
//     const code = /Forbidden|Unauthorized/.test(err.message) ? 401 : 500;
//     return NextResponse.json({ success: false, message: err.message }, { status: code });
//   }
// }

// /* =================================================
//    GET  /api/sales-orders   (list orders by company)
// =================================================== */
// export async function GET(req) {
//   await dbConnect();

//   try {
//     const token = getTokenFromHeader(req);
//     const user  = await verifyJWT(token);

//     /* allow company token OR user with Admin / Sales Manager role */
//     if (!user || (user.type === 'user' && !['Admin', 'Sales Manager'].includes(user.role))) {
//       return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
//     }

//     const salesOrders = await SalesOrder.find({ companyId: user.companyId });
//     return NextResponse.json({ success: true, data: salesOrders }, { status: 200 });
//   } catch (err) {
//     return NextResponse.json({ success: false, message: err.message }, { status: 500 });
//   }
// }




// import mongoose from "mongoose";
// import dbConnect from "@/lib/db";
// import SalesOrder from "@/models/SalesOrder"; // Your Sales Order model
// import Inventory from "@/models/Inventory";   // Inventory model (includes batches)
// import StockMovement from "@/models/StockMovement"; // Model for logging stock movements

// const { Types } = mongoose;

// export async function POST(req) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const orderData = await req.json();
//     console.log("Received Sales Order Data:", orderData);

//     // ----- Data Cleaning -----
//     delete orderData._id;
//     if (Array.isArray(orderData.items)) {
//       orderData.items = orderData.items.map((item) => {
//         delete item._id;
//         return item;
//       });
//     }

//     // ----- Create Sales Order Document -----
//     // Ensure addresses are properly structured
//     if (orderData.billingAddress && typeof orderData.billingAddress === 'object') {
//       // Remove _id if it exists to avoid conflicts
//       delete orderData.billingAddress._id;
//     }
//     if (orderData.shippingAddress && typeof orderData.shippingAddress === 'object') {
//       // Remove _id if it exists to avoid conflicts
//       delete orderData.shippingAddress._id;
//     }

//     // Create using an array so we can use the returned document from create()
//     const [order] = await SalesOrder.create([orderData], { session });
//     console.log("Sales Order created with _id:", order._id);

//     // ----- Process Each Order Item: Update Inventory (Only Committed) & Log Stock Movement -----
//     async function processItem(item) {
//       // Find the inventory record for this item in the specified warehouse.
//       const inventoryDoc = await Inventory.findOne({
//         item: new Types.ObjectId(item.item),
//         warehouse: new Types.ObjectId(item.warehouse),
//       }).session(session);

//       if (!inventoryDoc) {
//         throw new Error(
//           `No inventory record found for item ${item.item} in warehouse ${item.warehouse}`
//         );
//       }

//       // For Sales Orders, we "reserve" the stock by increasing the committed field.
//       // For batch-managed items, verify each allocated batch has enough available stock
//       // but do not deduct the physical quantity.
//       if (item.batches && item.batches.length > 0) {
//         for (const allocated of item.batches) {
//           const batchIndex = inventoryDoc.batches.findIndex(
//             (b) => b.batchNumber === allocated.batchCode
//           );
//           if (batchIndex === -1) {
//             throw new Error(
//               `Batch ${allocated.batchCode} not found in inventory for item ${item.item}`
//             );
//           }
//           // Verify that the batch has enough available stock to commit.
//           if (inventoryDoc.batches[batchIndex].quantity < allocated.allocatedQuantity) {
//             throw new Error(
//               `Insufficient stock in batch ${allocated.batchCode} for item ${item.item}`
//             );
//           }
//           // Note: We are not reducing the batch quantity here.
//         }
//       } else {
//         // For non-batch-managed items, ensure available inventory is sufficient.
//         if (inventoryDoc.quantity < item.quantity) {
//           throw new Error(
//             `Insufficient stock for item ${item.item} in warehouse ${item.warehouse}`
//           );
//         }
//         // Do not reduce inventoryDoc.quantity since we are only reserving (committing).
//       }

//       // Increase the committed field by the ordered quantity.
//       inventoryDoc.committed = (inventoryDoc.committed || 0) + item.quantity;

//       // Save the updated inventory document.
//       await inventoryDoc.save({ session });

//       // Log the stock movement as a "RESERVE" (or similar) action.
//       await StockMovement.create(
//         [
//           {
//             item: item.item,
//             warehouse: item.warehouse,
//             movementType: "RESERVE", // Indicates that stock is reserved, not reduced.
//             quantity: item.quantity,
//             reference: order._id,
//             remarks: "Sales Order - committed increased (reservation)",
//           },
//         ],
//         { session }
//       );
//     }

//     // Process each item in the sales order.
//     for (const item of orderData.items) {
//       await processItem(item);
//     }

//     await session.commitTransaction();
//     session.endSession();

//     return new Response(
//       JSON.stringify({
//         message: "Sales Order processed and committed stock updated",
//         orderId: order._id,
//       }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("Error processing Sales Order:", error.stack || error);
//     return new Response(
//       JSON.stringify({
//         message: "Error processing Sales Order",
//         error: error.message,
//       }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }






// export async function GET(req) {
//   try {
//     await dbConnect();
//     const salesOrders = await SalesOrder.find({});
//     return new Response(JSON.stringify(salesOrders), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     console.error("Error fetching Sales Orders:", error);
//     return new Response(
//       JSON.stringify({ message: "Error fetching Sales Orders", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }
