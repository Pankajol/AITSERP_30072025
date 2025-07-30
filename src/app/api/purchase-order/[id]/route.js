import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import dbConnect from "@/lib/db";
import PurchaseOrder from "@/models/PurchaseOrder";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export const config = { api: { bodyParser: false } };

// ✅ Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function PUT(req, { params }) {
  await dbConnect();
  const session = await mongoose.startSession();

  try {
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded?.companyId) {
      return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 401 });
    }

    const { id } = await params; // ✅ Await params
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid Purchase Order ID" }, { status: 400 });
    }

    const contentType = req.headers.get("content-type") || "";

    // ✅ CASE 1: JSON update (status + items) from GRN
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const updatedPO = await PurchaseOrder.findByIdAndUpdate(id, body, { new: true });
      return NextResponse.json(
        { success: true, message: "Purchase Order updated successfully", data: updatedPO },
        { status: 200 }
      );
    }

    // ✅ CASE 2: Full FormData update
    session.startTransaction();

    const formData = await req.formData();
    const rawData = formData.get("orderData");
    if (!rawData) {
      return NextResponse.json({ success: false, error: "Missing order data" }, { status: 400 });
    }

    let orderData;
    try {
      orderData = JSON.parse(rawData);
    } catch (err) {
      return NextResponse.json({ success: false, error: "Invalid JSON in orderData" }, { status: 400 });
    }

    // ✅ Handle Attachments
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

    const existingFiles = orderData.existingFiles || [];
    const removedFiles = orderData.removedFiles || [];

    for (const file of removedFiles) {
      if (file.cloudinaryId) {
        await cloudinary.uploader.destroy(file.cloudinaryId);
      }
    }

    orderData.attachments = [
      ...existingFiles.filter(f => !removedFiles.some(r => r.cloudinaryId === f.cloudinaryId)),
      ...uploadedFiles,
    ];

    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      return NextResponse.json({ success: false, error: "At least one item is required" }, { status: 422 });
    }

    const existingPO = await PurchaseOrder.findById(id).session(session);
    if (!existingPO) {
      await session.abortTransaction();
      return NextResponse.json({ success: false, error: "Purchase order not found" }, { status: 404 });
    }

    // ✅ Revert old Inventory
    for (const oldItem of existingPO.items) {
      if (oldItem.warehouse && oldItem.quantity) {
        await Inventory.updateOne(
          { item: oldItem.item, warehouse: oldItem.warehouse },
          { $inc: { onOrder: -oldItem.quantity } },
          { session }
        );
      }
    }

    // ✅ Update new Inventory
    for (const newItem of orderData.items) {
      if (newItem.warehouse && newItem.quantity) {
        await Inventory.updateOne(
          { item: newItem.item, warehouse: newItem.warehouse },
          { $inc: { onOrder: newItem.quantity } },
          { upsert: true, session }
        );

        await StockMovement.findOneAndUpdate(
          { reference: existingPO._id, item: newItem.item, warehouse: newItem.warehouse },
          {
            quantity: newItem.quantity,
            unitPrice: newItem.unitPrice,
            totalValue: newItem.unitPrice * newItem.quantity,
            remarks: `Updated via PO ${existingPO.documentNumber}`,
          },
          { upsert: true, session }
        );
      }
    }

    const updatedPO = await PurchaseOrder.findByIdAndUpdate(id, orderData, {
      new: true,
      runValidators: true,
      session,
    });

    await session.commitTransaction();

    return NextResponse.json(
      { success: true, message: "Purchase Order updated successfully", data: updatedPO },
      { status: 200 }
    );
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("Purchase Order Update Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    session.endSession();
  }
}



export async function GET(request, { params }) {
  await dbConnect();
  const { id } = params;               // ← no await here!

  try {
    // Make sure id is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID' },
        { status: 400 }
      );
    }

    const order = await PurchaseOrder.findById(id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Purchase order not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: order },
      { status: 200 }
    );
  } catch (err) {
    console.error('API Error fetching PO:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}


export async function DELETE(req, { params }) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    await PurchaseOrder.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Deleted successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
