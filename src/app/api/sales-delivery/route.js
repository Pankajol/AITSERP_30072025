import mongoose from "mongoose";
import formidable from "formidable";
import { Readable } from "stream";
import dbConnect from "@/lib/db";
import Delivery from "@/models/deliveryModels";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import SalesOrder from "@/models/SalesOrder";
import SalesInvoice from "@/models/SalesInvoice";
import Counter from "@/models/Counter";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

export const config = { api: { bodyParser: false } };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const { Types } = mongoose;

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

async function parseMultipart(request) {
  const nodeReq = await toNodeReq(request);
  const form = formidable({ multiples: true, keepExtensions: true });
  return await new Promise((res, rej) =>
    form.parse(nodeReq, (err, fields, files) => (err ? rej(err) : res({ fields, files })))
  );
}

export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("JWT token missing");
    const user = await verifyJWT(token);
    if (!user) throw new Error("Unauthorized");

    const { fields, files } = await parseMultipart(req);
    const deliveryData = JSON.parse(fields.deliveryData || "{}");

    deliveryData.deliveryDate = deliveryData.deliveryDate || new Date();
    deliveryData.deliveryType = deliveryData.deliveryType || "Sales";
    deliveryData.companyId = user.companyId;
    if (user.type === "user") deliveryData.createdBy = user.id;

    delete deliveryData._id;
    if (Array.isArray(deliveryData.items)) {
      deliveryData.items = deliveryData.items.map(item => {
        delete item._id;
        return item;
      });
    }

    // ---------------- Handle File Uploads ----------------
    const newFiles = Array.isArray(files.newAttachments)
      ? files.newAttachments
      : files.newAttachments
      ? [files.newAttachments]
      : [];

    const uploadedFiles = await Promise.all(
      newFiles.map(async file => {
        const result = await cloudinary.uploader.upload(file.filepath, {
          folder: "deliveries",
          resource_type: "auto",
        });
        return {
          fileName: file.originalFilename,
          fileUrl: result.secure_url,
          fileType: file.mimetype,
          uploadedAt: new Date(),
        };
      })
    );

    deliveryData.attachments = [
      ...(deliveryData.attachments || []),
      ...uploadedFiles,
    ];

    // ---------------- Generate Document Number ----------------
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    let fyStart = currentYear;
    let fyEnd = currentYear + 1;
    if (currentMonth < 4) {
      fyStart = currentYear - 1;
      fyEnd = currentYear;
    }
    const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
    const counterKey = "Sales Delivery";

    let counter = await Counter.findOne({ id: counterKey, companyId: user.companyId }).session(session);
    if (!counter) {
      const [created] = await Counter.create(
        [{ id: counterKey, companyId: user.companyId, seq: 1 }],
        { session }
      );
      counter = created;
    } else {
      counter.seq += 1;
      await counter.save({ session });
    }

    const paddedSeq = String(counter.seq).padStart(5, "0");
    deliveryData.documentNumberDelivery = `SALES-DEL/${financialYear}/${paddedSeq}`;

    // ---------------- Create Delivery ----------------
    const [delivery] = await Delivery.create([deliveryData], { session });

    const isCopied = !!deliveryData.sourceId;
    const sourceModel = (deliveryData.sourceModel || "salesorder").toLowerCase();

    // ---------------- Update Inventory ----------------
    for (const item of deliveryData.items) {
      const inventoryDoc = await Inventory.findOne({
        item: new Types.ObjectId(item.item),
        warehouse: new Types.ObjectId(item.warehouse),
      }).session(session);

      if (!inventoryDoc) throw new Error(`No inventory record for item ${item.item}`);

      if (item.batches?.length > 0) {
        for (const allocated of item.batches) {
          const batchIndex = inventoryDoc.batches.findIndex(b => b.batchNumber === allocated.batchCode);
          if (batchIndex === -1) throw new Error(`Batch ${allocated.batchCode} not found`);
          if (inventoryDoc.batches[batchIndex].quantity < allocated.allocatedQuantity) {
            throw new Error(`Insufficient stock in batch ${allocated.batchCode}`);
          }
          inventoryDoc.batches[batchIndex].quantity -= allocated.allocatedQuantity;
        }
      }

      if (inventoryDoc.quantity < item.quantity) {
        throw new Error(`Insufficient stock for item ${item.item}`);
      }

      inventoryDoc.quantity -= item.quantity;
      inventoryDoc.committed = Math.max((inventoryDoc.committed || 0) - item.quantity, 0);
      await inventoryDoc.save({ session });

      await StockMovement.create(
        [{
          companyId: user.companyId,
          item: item.item,
          warehouse: item.warehouse,
          movementType: "OUT",
          quantity: item.quantity,
          reference: delivery._id,
          remarks: sourceModel === "salesorder" ? "Sales Order Delivery" : "Delivery",
        }],
        { session }
      );
    }

    // ---------------- Update Source Document (SO / SI) ----------------
    if (isCopied && sourceModel === "salesorder") {
      const so = await SalesOrder.findById(deliveryData.sourceId).session(session);
      if (!so) throw new Error("Sales Order not found");

      // Update delivered quantities
      for (const soItem of so.items) {
        const deliveredItem = deliveryData.items.find(i => i.item.toString() === soItem.item.toString());
        if (deliveredItem) {
          soItem.deliveredQuantity = (soItem.deliveredQuantity || 0) + deliveredItem.quantity;
        }
      }

      // Update status
      const allDelivered = so.items.every(i => i.deliveredQuantity >= i.quantity);
      const anyDelivered = so.items.some(i => i.deliveredQuantity > 0);
      so.status = allDelivered ? "Complete" : anyDelivered ? "Partially Complete" : "Pending";

      await so.save({ session });
    }

    // Handle multiple linked sales orders (optional)
    if (Array.isArray(deliveryData.salesOrder) && deliveryData.salesOrder.length > 0) {
      await SalesOrder.updateMany(
        { _id: { $in: deliveryData.salesOrder }, companyId: user.companyId },
        {
          $set: {
            linkedPurchaseOrder: delivery._id,
            status: "completed",
          },
        },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    return new Response(
      JSON.stringify({ success: true, message: "Delivery processed successfully", deliveryId: delivery._id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Delivery creation failed:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}



// ---------------- GET HANDLER ----------------
// export async function GET(req) {
//   await dbConnect();

//   try {
//     const token = getTokenFromHeader(req);
//     if (!token)
//       return new Response(JSON.stringify({ message: "Unauthorized" }), {
//         status: 401,
//         headers: { "Content-Type": "application/json" },
//       });

//     const user = verifyJWT(token);
//     if (!user)
//       return new Response(JSON.stringify({ message: "Unauthorized" }), {
//         status: 401,
//         headers: { "Content-Type": "application/json" },
//       });

//     const deliveries = await Delivery.find({ companyId: user.companyId }).lean();

//     // Fetch related Sales Orders
//     const soIds = deliveries
//       .filter(d => d.sourceId && d.sourceModel === "salesorder")
//       .map(d => mongoose.Types.ObjectId(d.sourceId));

//     let salesOrdersMap = {};
//     if (soIds.length > 0) {
//       const salesOrders = await SalesOrder.find({ _id: { $in: soIds } }).lean();
//       salesOrdersMap = salesOrders.reduce((acc, so) => {
//         acc[so._id.toString()] = so;
//         return acc;
//       }, {});
//     }

//     const deliveriesWithSO = deliveries.map(d => ({
//       ...d,
//       salesOrder: d.sourceId && d.sourceModel === "salesorder"
//         ? salesOrdersMap[d.sourceId] || null
//         : null,
//     }));

//     return new Response(
//       JSON.stringify({ success: true, data: deliveriesWithSO }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     console.error("Error fetching deliveries:", error);
//     return new Response(
//       JSON.stringify({ success: false, message: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }



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

// // Convert Next.js Request to Node.js req for formidable
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

// // Parse multipart/form-data
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
//     // ✅ Auth
//     const token = getTokenFromHeader(req);
//     if (!token) throw new Error("JWT token missing");
//     const user = await verifyJWT(token);
//     if (!user) throw new Error("Unauthorized");

//     // ✅ Parse form data
//     const { fields, files } = await parseMultipart(req);
//     const deliveryData = JSON.parse(fields.deliveryData || "{}");

//     deliveryData.deliveryDate = deliveryData.deliveryDate || new Date();
//     deliveryData.deliveryType = deliveryData.deliveryType || "Sales";
//     deliveryData.companyId = user.companyId;
//     if (user.type === "user") deliveryData.createdBy = user.id;

//     delete deliveryData._id;
//     if (Array.isArray(deliveryData.items)) {
//       deliveryData.items = deliveryData.items.map((item) => {
//         delete item._id;
//         return item;
//       });
//     }

//     // ✅ Handle file uploads
//     const newFiles = Array.isArray(files.newFiles)
//       ? files.newFiles
//       : files.newFiles
//       ? [files.newFiles]
//       : [];

//     const uploadedFiles = await Promise.all(
//       newFiles.map(async (file) => {
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

//     // ✅ Generate document number
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

//     // ✅ Create Delivery
//     const [delivery] = await Delivery.create([deliveryData], { session });

//     const isCopied = !!deliveryData.sourceId;
//     const sourceModel = (deliveryData.sourceModel || "salesorder").toLowerCase();
//     const isSODelivery = isCopied && sourceModel === "salesorder";

//     // ✅ Update inventory & create stock movement
//     for (const item of deliveryData.items) {
//       const inventoryDoc = await Inventory.findOne({
//         item: new Types.ObjectId(item.item),
//         warehouse: new Types.ObjectId(item.warehouse),
//       }).session(session);

//       if (!inventoryDoc) throw new Error(`No inventory record for item ${item.item} in warehouse ${item.warehouse}`);

//       // Batch allocation
//       if (item.batches?.length > 0) {
//         for (const allocated of item.batches) {
//           const batchIndex = inventoryDoc.batches.findIndex(
//             (b) => b.batchNumber === allocated.batchCode
//           );
//           if (batchIndex === -1) throw new Error(`Batch ${allocated.batchCode} not found`);
//           if (inventoryDoc.batches[batchIndex].quantity < allocated.allocatedQuantity)
//             throw new Error(`Insufficient stock in batch ${allocated.batchCode}`);
//           inventoryDoc.batches[batchIndex].quantity -= allocated.allocatedQuantity;
//         }
//       }

//       if (inventoryDoc.quantity < item.quantity) throw new Error(`Insufficient stock for item ${item.item}`);
//       inventoryDoc.quantity -= item.quantity;
//       inventoryDoc.committed = Math.max((inventoryDoc.committed || 0) - item.quantity, 0);
//       await inventoryDoc.save({ session });

//       await StockMovement.create(
//         [
//           {
//             companyId: user.companyId,
//             item: item.item,
//             warehouse: item.warehouse,
//             movementType: "OUT",
//             quantity: item.quantity,
//             reference: delivery._id,
//             remarks: isSODelivery ? "Sales Order Delivery" : "Delivery",
//           },
//         ],
//         { session }
//       );
//     }

//     // ✅ Update source document status (Sales Order or Invoice)
//     if (isCopied) {
//       if (sourceModel === "salesorder") {
//         const so = await SalesOrder.findById(deliveryData.sourceId).session(session);
//         if (so) {
//           let allDelivered = true;
//           let anyDelivered = false;

//           // Fetch all deliveries linked to this SO
//           const allDeliveries = await Delivery.find({
//             sourceId: so._id,
//             sourceModel: "salesorder",
//             companyId: user.companyId,
//           }).session(session);

//           for (const soItem of so.items) {
//             let totalDelivered = 0;
//             for (const del of allDeliveries) {
//               const itemDel = del.items.find(
//                 (i) => i.item.toString() === soItem.item.toString()
//               );
//               if (itemDel) totalDelivered += itemDel.quantity;
//             }

//             if (totalDelivered > 0) anyDelivered = true;
//             if (totalDelivered < soItem.quantity) allDelivered = false;
//           }

//           so.status = allDelivered ? "Complete" : anyDelivered ? "Partially Complete" : so.status;
//           await so.save({ session });
//         }
//       } else if (sourceModel === "salesinvoice") {
//         await SalesInvoice.findByIdAndUpdate(deliveryData.sourceId, { status: "Delivered" }, { session });
//       }
//     }

//     await session.commitTransaction();
//     session.endSession();

//     return new Response(
//       JSON.stringify({
//         success: true,
//         message: "Delivery processed successfully",
//         deliveryId: delivery._id,
//       }),
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
