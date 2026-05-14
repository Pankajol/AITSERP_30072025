import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import dbConnect from "@/lib/db";

import Supplier from "@/models/SupplierModels";
import Item from "@/models/ItemModels";
import PurchaseQuotation from "@/models/PurchaseQuotationModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Counter from "@/models/Counter";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = { api: { bodyParser: false } };

// Helper: validate token and return companyId
async function validateRequest(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Unauthorized", status: 401 };
  const decoded = verifyJWT(token);
  if (!decoded) return { error: "Invalid token", status: 401 };
  const companyId = decoded.companyId;
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    return { error: "Invalid company ID", status: 400 };
  }
  return { user: decoded, companyId };
}

// Helper: generate document number with counter
async function generateDocumentNumber(companyId, session) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  let fyStart = currentYear;
  if (currentMonth < 4) fyStart = currentYear - 1;
  const financialYear = `${fyStart}-${String(fyStart + 1).slice(-2)}`;
  const key = "PurchaseQuotation";

  const counter = await Counter.findOneAndUpdate(
    { id: key, companyId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session }
  );

  const paddedSeq = String(counter.seq).padStart(5, "0");
  return `PURCH-QUA/${financialYear}/${paddedSeq}`;
}

// Helper: ensure grandTotal exists (map from total if needed)
function ensureGrandTotal(data) {
  if (data.grandTotal === undefined && data.total !== undefined) {
    data.grandTotal = data.total;
    delete data.total;
  }
  return data;
}

// POST – Create new purchase quotation
export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const validation = await validateRequest(req);
    if (validation.error) {
      return NextResponse.json({ success: false, error: validation.error }, { status: validation.status });
    }
    const { companyId } = validation;

    const contentType = req.headers.get("content-type") || "";
    let jsonData, files = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      jsonData = JSON.parse(formData.get("data"));
      files = formData.getAll("attachments") || [];
    } else {
      jsonData = await req.json();
    }

    jsonData = ensureGrandTotal(jsonData);

    if (!jsonData.supplier || !mongoose.Types.ObjectId.isValid(jsonData.supplier)) {
      return NextResponse.json({ success: false, error: "Valid supplier ID required" }, { status: 422 });
    }
    if (!Array.isArray(jsonData.items) || jsonData.items.length === 0) {
      return NextResponse.json({ success: false, error: "At least one item is required" }, { status: 422 });
    }

    const uploadedFiles = [];
    for (const file of files) {
      if (!file.size) continue;
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadRes = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "purchase-quotations", resource_type: "auto" },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(buffer);
      });
      uploadedFiles.push({
        fileName: file.name,
        fileType: file.type,
        fileUrl: uploadRes.secure_url,
        cloudinaryId: uploadRes.public_id,
        uploadedAt: new Date(),
      });
    }

    const finalAttachments = [...(jsonData.existingFiles || []), ...uploadedFiles];
    const documentNumber = await generateDocumentNumber(companyId, session);

    const quotationData = {
      ...jsonData,
      companyId,
      documentNumber,
      attachments: finalAttachments,
    };

    const [quotation] = await PurchaseQuotation.create([quotationData], { session });

    await session.commitTransaction();
    session.endSession();

    const populated = await PurchaseQuotation.findById(quotation._id)
      .populate("supplier", "supplierCode supplierName contactPerson")
      .populate("items.item", "itemCode itemName unitPrice");

    return NextResponse.json(
      { success: true, data: populated, message: "Purchase Quotation created successfully" },
      { status: 201 }
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("POST /api/purchase-quotation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET – List, stats, or single
export async function GET(req) {
  await dbConnect();

  try {
    const validation = await validateRequest(req);
    if (validation.error) return NextResponse.json({ success: false, error: validation.error }, { status: validation.status });
    const { companyId } = validation;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const stats = searchParams.get("stats") === "true";

    // Single quotation by ID
    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
      }
      const quotation = await PurchaseQuotation.findOne({ _id: id, companyId })
        .populate("supplier", "supplierCode supplierName contactPerson")
        .populate("items.item", "itemCode itemName unitPrice imageUrl variants")
        .populate('items.variant'); 
      if (!quotation) {
        return NextResponse.json({ success: false, error: "Quotation not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: quotation });
    }

    // Stats endpoint – robust sum with $toDouble
if (stats) {
  const total = await PurchaseQuotation.countDocuments({ companyId });
  const open = await PurchaseQuotation.countDocuments({ companyId, status: "Open" });
  const copiedToOrder = await PurchaseQuotation.countDocuments({ companyId, status: "CopiedToOrder" });
  const convertedToOrder = await PurchaseQuotation.countDocuments({ companyId, status: "ConvertedToOrder" });
  const partiallyOrdered = await PurchaseQuotation.countDocuments({ companyId, status: "PartiallyOrdered" });
  const fullyOrdered = await PurchaseQuotation.countDocuments({ companyId, status: "FullyOrdered" });

  const totalValueAgg = await PurchaseQuotation.aggregate([
    { $match: { companyId } },
    { $group: { _id: null, totalValue: { $sum: "$grandTotal" } } }
  ]);
  const totalValue = totalValueAgg[0]?.totalValue || 0;

  return NextResponse.json({
    success: true,
    data: { total, open, copiedToOrder, convertedToOrder, partiallyOrdered, fullyOrdered, totalValue }
  });
}

    // Paginated list
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";
    const statusFilter = searchParams.get("status");

    const query = { companyId };
    if (search) {
      query.$or = [
        { supplierName: { $regex: search, $options: "i" } },
        { documentNumber: { $regex: search, $options: "i" } },
      ];
    }
    if (statusFilter && statusFilter !== "All") {
      query.status = statusFilter;
    }

    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      PurchaseQuotation.find(query)
        .populate("supplier", "supplierName supplierCode contactPerson")
        .populate("items.item", "itemCode itemName unitPrice imageUrl variants")
        .populate('items.variant')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PurchaseQuotation.countDocuments(query),
    ]);

    const data = docs.map(doc => ({
      ...doc,
      supplierName: doc.supplier?.supplierName || "—",
    }));

    return NextResponse.json({
      success: true,
      data,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("GET /api/purchase-quotation error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch purchase quotations" }, { status: 500 });
  }
}

// PUT – Update
export async function PUT(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const validation = await validateRequest(req);
    if (validation.error) {
      return NextResponse.json({ success: false, error: validation.error }, { status: validation.status });
    }
    const { companyId } = validation;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Valid ID required" }, { status: 400 });
    }

    const contentType = req.headers.get("content-type") || "";
    let jsonData, files = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      jsonData = JSON.parse(formData.get("data"));
      files = formData.getAll("attachments") || [];
    } else {
      jsonData = await req.json();
    }

    jsonData = ensureGrandTotal(jsonData);

    const uploadedFiles = [];
    for (const file of files) {
      if (!file.size) continue;
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadRes = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "purchase-quotations", resource_type: "auto" },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(buffer);
      });
      uploadedFiles.push({
        fileName: file.name,
        fileType: file.type,
        fileUrl: uploadRes.secure_url,
        cloudinaryId: uploadRes.public_id,
        uploadedAt: new Date(),
      });
    }

    const existingFiles = jsonData.existingFiles || [];
    const removedFiles = jsonData.removedFiles || [];
    for (const file of removedFiles) {
      if (file.cloudinaryId) {
        await cloudinary.uploader.destroy(file.cloudinaryId);
      }
    }

    const finalAttachments = [
      ...existingFiles.filter(f => !removedFiles.some(r => r.cloudinaryId === f.cloudinaryId)),
      ...uploadedFiles,
    ];

    const updatedQuotation = await PurchaseQuotation.findOneAndUpdate(
      { _id: id, companyId },
      { ...jsonData, attachments: finalAttachments },
      { new: true, runValidators: true, session }
    )
      .populate("supplier", "supplierCode supplierName contactPerson")
      .populate("items.item", "itemCode itemName unitPrice imageUrl variants");

    if (!updatedQuotation) {
      await session.abortTransaction();
      return NextResponse.json({ success: false, error: "Quotation not found" }, { status: 404 });
    }

    await session.commitTransaction();
    return NextResponse.json({ success: true, message: "Quotation updated", data: updatedQuotation }, { status: 200 });
  } catch (error) {
    await session.abortTransaction();
    console.error("PUT /api/purchase-quotation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    session.endSession();
  }
}

// DELETE
export async function DELETE(req) {
  await dbConnect();

  try {
    const validation = await validateRequest(req);
    if (validation.error) {
      return NextResponse.json({ success: false, error: validation.error }, { status: validation.status });
    }
    const { companyId } = validation;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Valid ID required" }, { status: 400 });
    }

    const quotation = await PurchaseQuotation.findOne({ _id: id, companyId });
    if (!quotation) {
      return NextResponse.json({ success: false, error: "Quotation not found" }, { status: 404 });
    }

    for (const att of quotation.attachments) {
      if (att.cloudinaryId) {
        await cloudinary.uploader.destroy(att.cloudinaryId).catch(e => console.warn(e));
      }
    }

    await PurchaseQuotation.deleteOne({ _id: id, companyId });

    return NextResponse.json({ success: true, message: "Quotation deleted" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/purchase-quotation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}