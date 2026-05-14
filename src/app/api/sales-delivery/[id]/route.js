import { NextResponse } from "next/server";
import mongoose from "mongoose";
import formidable from "formidable";
import { Readable } from "stream";
import dbConnect from "@/lib/db";
import Delivery from "@/models/deliveryModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

export const config = { api: { bodyParser: false } };

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

export async function PUT(req, { params }) {
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

    const deliveryId = params.id;
    if (!deliveryId) throw new Error("Missing Delivery ID");

    // ✅ Handle new files upload
    const newFiles = Array.isArray(files.newFiles) ? files.newFiles : files.newFiles ? [files.newFiles] : [];
    const uploadedFiles = await Promise.all(
      newFiles.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.filepath, {
          folder: "sales_delivery",
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

    // ✅ Remove files marked for deletion
    const removedFiles = fields["removedFiles[]"] ? [].concat(fields["removedFiles[]"]) : [];
    if (removedFiles.length) {
      await Delivery.updateOne(
        { _id: deliveryId },
        { $pull: { attachments: { fileName: { $in: removedFiles } } } }
      );
    }

    // ✅ Add uploaded files to attachments
    if (!deliveryData.attachments) deliveryData.attachments = [];
    deliveryData.attachments = [...deliveryData.attachments, ...uploadedFiles];

    // ✅ Ensure required fields
    if (!deliveryData.deliveryDate) deliveryData.deliveryDate = new Date();
    if (!deliveryData.deliveryType) deliveryData.deliveryType = "Sales";

    // ✅ Update the delivery document
    await Delivery.findByIdAndUpdate(deliveryId, deliveryData, { new: true, session });

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ success: true, message: "Delivery updated successfully" }, { status: 200 });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error updating delivery:", err.message);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}


export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;  // Ensure params are awaited here.
    const SalesDeliverys = await Delivery.findById(id);
    if (!SalesDeliverys) {
      return new Response(JSON.stringify({ message: "SalesDeliverys not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, data: SalesDeliverys }), {
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

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;  // Ensure params are awaited here.
    const deletedSalesDelivery = await Delivery.findByIdAndDelete(id);
    if (!deletedSalesDelivery) {
      return new Response(JSON.stringify({ message: "updateddeletedSalesDelivery not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ message: "updateddeletedSalesDelivery deleted successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error deleting updateddeletedSalesDelivery:", error);
    return new Response(
      JSON.stringify({ message: "Error deleting updateddeletedSalesDelivery", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}