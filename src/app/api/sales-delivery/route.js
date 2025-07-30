import mongoose from "mongoose";
import formidable from "formidable";
import { Readable } from "stream";
import dbConnect from "@/lib/db";
import Delivery from "@/models/deliveryModels";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import SalesOrder from "@/models/SalesOrder";
import SalesInvoice from "@/models/SalesInvoice";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

export const config = { api: { bodyParser: false } };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const { Types } = mongoose;

// ✅ Convert Next.js request to Node.js stream
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

// ✅ Parse multipart form
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
    // ✅ JWT Auth
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("JWT token missing");
    const user = await verifyJWT(token);
    if (!user) throw new Error("Unauthorized");

    const { fields, files } = await parseMultipart(req);
    const deliveryData = JSON.parse(fields.deliveryData || "{}");

    // ✅ Ensure required fields
    deliveryData.deliveryDate = deliveryData.deliveryDate || new Date();
    deliveryData.deliveryType = deliveryData.deliveryType || "Sales";
    deliveryData.companyId = user.companyId;
    if (user.type === "user") deliveryData.createdBy = user.id;

    // ✅ Clean unwanted fields
    delete deliveryData._id;
    if (Array.isArray(deliveryData.items)) {
      deliveryData.items = deliveryData.items.map((item) => {
        delete item._id;
        return item;
      });
    }

    // ✅ Handle file uploads
    const newFiles = Array.isArray(files.newFiles)
      ? files.newFiles
      : files.newFiles
      ? [files.newFiles]
      : [];

    const uploadedFiles = await Promise.all(
      newFiles.map(async (file) => {
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

    // ✅ Create delivery
    const [delivery] = await Delivery.create([deliveryData], { session });

    // ✅ Check if copied from Sales Order
    const isCopied = !!deliveryData.sourceId;
    const sourceModel = (deliveryData.sourceModel || "salesorder").toLowerCase();
    const isSODelivery = isCopied && sourceModel === "salesorder";

    // ✅ Update Inventory & Stock Movement
    for (const item of deliveryData.items) {
      const inventoryDoc = await Inventory.findOne({
        item: new Types.ObjectId(item.item),
        warehouse: new Types.ObjectId(item.warehouse),
      }).session(session);

      if (!inventoryDoc) {
        throw new Error(`No inventory record for item ${item.item} in warehouse ${item.warehouse}`);
      }

      // ✅ Reduce batch quantities
      if (item.batches?.length > 0) {
        for (const allocated of item.batches) {
          const batchIndex = inventoryDoc.batches.findIndex(
            (b) => b.batchNumber === allocated.batchCode
          );
          if (batchIndex === -1) {
            throw new Error(`Batch ${allocated.batchCode} not found`);
          }
          if (inventoryDoc.batches[batchIndex].quantity < allocated.allocatedQuantity) {
            throw new Error(`Insufficient stock in batch ${allocated.batchCode}`);
          }
          inventoryDoc.batches[batchIndex].quantity -= allocated.allocatedQuantity;
        }
      }

      // ✅ Reduce overall stock
      if (inventoryDoc.quantity < item.quantity) {
        throw new Error(`Insufficient stock for item ${item.item}`);
      }
      inventoryDoc.quantity -= item.quantity;

      // ✅ Reduce committed stock
      inventoryDoc.committed = Math.max((inventoryDoc.committed || 0) - item.quantity, 0);

      // ✅ Save inventory update
      await inventoryDoc.save({ session });

      // ✅ Log stock movement with companyId
      await StockMovement.create(
        [
          {
            companyId: user.companyId,
            item: item.item,
            warehouse: item.warehouse,
            movementType: "OUT",
            quantity: item.quantity,
            reference: delivery._id,
            remarks: isSODelivery ? "Sales Order Delivery" : "Delivery",
          },
        ],
        { session }
      );
    }

    // ✅ Update Source Document if copied
    if (isCopied) {
      if (sourceModel === "salesorder") {
        await SalesOrder.findByIdAndUpdate(deliveryData.sourceId, { status: "Delivered" }, { session });
      } else if (sourceModel === "salesinvoice") {
        await SalesInvoice.findByIdAndUpdate(deliveryData.sourceId, { status: "Delivered" }, { session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Delivery processed successfully",
        deliveryId: delivery._id,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}




export async function GET(req) {
  try {
    await dbConnect();
    const SalesDeliverys = await Delivery.find({});
    return new Response(JSON.stringify(SalesDeliverys), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching SalesDeliverys:", error);
    return new Response(
      JSON.stringify({ message: "Error fetching SalesDeliverys", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}