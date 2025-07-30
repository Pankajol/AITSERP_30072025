import { NextResponse } from 'next/server';
import formidable from 'formidable';
import { Readable } from 'stream';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import SalesOrder from '@/models/SalesOrder';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';
import { v2 as cloudinary } from 'cloudinary';

export const config = { api: { bodyParser: false } };

// ✅ Cloudinary Config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

// ✅ Parse multipart
async function parseMultipart(request) {
  const nodeReq = await toNodeReq(request);
  const form = formidable({ multiples: true, keepExtensions: true });
  return new Promise((resolve, reject) =>
    form.parse(nodeReq, (err, fields, files) =>
      err ? reject(err) : resolve({ fields, files })
    )
  );
}

export async function PUT(req, { params }) {
  await dbConnect();
  const { id } = params;

  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  try {
    /* 1 — Auth */
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("JWT token missing");

    const user = await verifyJWT(token);
    if (!user) throw new Error("Unauthorized");

    /* 2 — Parse multipart data */
    const { fields, files } = await parseMultipart(req);
    const updatedData = JSON.parse(fields.orderData || "{}");

    // Remove _id from payload to avoid overwrite
    delete updatedData._id;
    updatedData.items?.forEach(i => delete i._id);

    /* 3 — Handle removed files */
    const removedFiles = JSON.parse(fields.removedFiles || "[]");

    /* 4 — Handle new files upload */
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

    /* 5 — Get existing order */
    const order = await SalesOrder.findById(id).session(mongoSession);
    if (!order) throw new Error("Sales Order not found");

    // Remove deleted files
    order.attachments = order.attachments.filter(
      (att) => !removedFiles.some(rf => rf.fileUrl === att.fileUrl)
    );

    // Add new files
    order.attachments.push(...uploadedFiles);

    // Merge other fields
    Object.assign(order, updatedData);

    await order.save({ session: mongoSession });

    await mongoSession.commitTransaction();
    mongoSession.endSession();

    return NextResponse.json({ success: true, message: "Order updated" }, { status: 200 });
  } catch (err) {
    await mongoSession.abortTransaction();
    mongoSession.endSession();
    console.error("❌ Error updating sales order:", err.message);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}


export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;  // Ensure params are awaited here.
    const salesOrder = await SalesOrder.findById(id);
    if (!salesOrder) {
      return new Response(JSON.stringify({ message: "Sales Order not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, data: salesOrder }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching Sales Order:", error);
    return new Response(
      JSON.stringify({ message: "Error fetching Sales Order", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;  // Ensure params are awaited here.
    const deletedSalesOrder = await SalesOrder.findByIdAndDelete(id);
    if (!deletedSalesOrder) {
      return new Response(JSON.stringify({ message: "Sales Order not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ message: "Sales Order deleted successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error deleting Sales Order:", error);
    return new Response(
      JSON.stringify({ message: "Error deleting Sales Order", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}