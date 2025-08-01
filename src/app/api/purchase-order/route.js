import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import PurchaseOrder from "@/models/PurchaseOrder";
import PurchaseQuotation from "@/models/PurchaseQuotationModel";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";
import Supplier from "@/models/SupplierModels";
import ItemModels from "@/models/ItemModels";
export const config = { api: { bodyParser: false } };

// ✅ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});





export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();

  try {
    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded?.companyId)
      return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 401 });

    const formData = await req.formData();
    const rawData = formData.get("orderData");
    if (!rawData)
      return NextResponse.json({ success: false, error: "Missing order data" }, { status: 400 });

    let orderData;
    try {
      orderData = JSON.parse(rawData);
    } catch (err) {
      return NextResponse.json({ success: false, error: "Invalid JSON in orderData" }, { status: 400 });
    }

    // ✅ Clean data
    delete orderData._id;
    orderData.companyId = decoded.companyId;
    orderData.createdBy = decoded.id;
    orderData.orderStatus = "Open";

    // ✅ Handle File Upload (Attachments)
    const files = formData.getAll("attachments");
    const uploadedFiles = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const uploadRes = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "purchase-orders", resource_type: "auto" },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(Buffer.from(buffer));
      });
      uploadedFiles.push({
        fileName: file.name,
        fileType: file.type,
        fileUrl: uploadRes.secure_url,
        cloudinaryId: uploadRes.public_id,
      });
    }

    // ✅ Merge existing and new attachments
    const existingFiles = orderData.existingFiles || [];
    const removedFiles = orderData.removedFiles || [];
    orderData.attachments = [
      ...existingFiles.filter((f) => !removedFiles.some((r) => r.cloudinaryId === f.cloudinaryId)),
      ...uploadedFiles,
    ];

    // ✅ If copied from Quotation
    if (orderData.sourcePurchaseQuotationId) {
      const pq = await PurchaseQuotation.findById(orderData.sourcePurchaseQuotationId);
      if (pq) {
        orderData.supplier = orderData.supplier || pq.supplier;
        orderData.items = orderData.items?.length ? orderData.items : pq.items;
        await PurchaseQuotation.updateOne({ _id: pq._id }, { status: "ConvertedToOrder" });
      }
    }

    // ✅ Validate Items
    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      return NextResponse.json({ success: false, error: "At least one item is required" }, { status: 422 });
    }

    // ✅ Save in DB with Transaction
    session.startTransaction();
    const [purchaseOrder] = await PurchaseOrder.create([orderData], { session });

    // ✅ Stock Impact: Increase onOrder qty & log StockMovement
    for (const item of purchaseOrder.items) {
      await Inventory.updateOne(
        { item: item.item, warehouse: item.warehouse, companyId: decoded.companyId },
        { $inc: { onOrder: item.quantity || 0 } },
        { upsert: true, session }
      );

      await StockMovement.create(
        [{
          item: item.item,
          warehouse: item.warehouse,
          companyId: decoded.companyId,
          movementType: "ON_ORDER",
          quantity: item.quantity,
          reference: purchaseOrder._id,
          referenceType: "PurchaseOrder",
          remarks: "Stock on order via Purchase Order",
          createdBy: decoded.id,
        }],
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json(
      { success: true, message: "Purchase Order created successfully", data: purchaseOrder },
      { status: 201 }
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Purchase Order Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}





export async function GET(req) {
  try {
    await dbConnect();

    // ✅ Authentication
    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded)
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
   const user = await verifyJWT(token);
if (!user) {
  return NextResponse.json({ success: false, message: 'Unauthorized: Invalid token' }, { status: 401 });
}
    // ✅ Parse filters (optional)
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const supplier = searchParams.get("supplier");

    // const query = {};  
    const query = { companyId: user.companyId };
    if (status) query.orderStatus = status;
    if (supplier) query.supplier = supplier;

    // ✅ Fetch data
    const orders = await PurchaseOrder.find(query)
      .populate("supplier", "supplierName supplierCode contactPerson")
      .populate("items.item", "itemName itemCode")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: orders }, { status: 200 });
  } catch (error) {
    console.error("GET /api/purchase-order error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
