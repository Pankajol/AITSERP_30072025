import { NextResponse } from "next/server";
import mongoose, { Types } from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import formidable from "formidable";
import { Readable } from "stream";
import dbConnect from "@/lib/db";
import CreditNote from "@/models/CreditMemo";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export const config = { api: { bodyParser: false } };
export const dynamic = "force-dynamic";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function createNodeCompatibleRequest(req) {
  const nodeReq = Readable.fromWeb(req.body);
  nodeReq.headers = Object.fromEntries(req.headers.entries());
  nodeReq.method = req.method;
  return nodeReq;
}

async function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ multiples: true, keepExtensions: true });
    const nodeReq = createNodeCompatibleRequest(req);

    form.parse(nodeReq, (err, fields, files) => {
      if (err) return reject(err);

      const parsedFields = {};
      for (const key in fields) {
        parsedFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
      }

      const parsedFiles = {};
      for (const key in files) {
        parsedFiles[key] = Array.isArray(files[key]) ? files[key] : [files[key]];
      }

      resolve({ fields: parsedFields, files: parsedFiles });
    });
  });
}

async function uploadFiles(fileObjects, folderName, companyId) {
  if (!fileObjects || !fileObjects.length) return [];
  return await Promise.all(
    fileObjects.map(async (file) => {
      const result = await cloudinary.uploader.upload(file.filepath, {
        folder: `${folderName}/${companyId || "default_company"}`,
        resource_type: "auto",
      });
      return {
        fileName: file.originalFilename || result.original_filename,
        fileUrl: result.secure_url,
        fileType: file.mimetype,
        publicId: result.public_id,
      };
    })
  );
}

async function deleteFiles(publicIds) {
  if (!Array.isArray(publicIds) || !publicIds.length) return;
  await cloudinary.api.delete_resources(publicIds);
}

function validateItems(items) {
  if (!Array.isArray(items) || !items.length) {
    throw new Error("Credit Note must have at least one item.");
  }
  for (const [i, item] of items.entries()) {
    if (!item.item || !item.warehouse || item.quantity <= 0) {
      throw new Error(`Item at row ${i + 1} is invalid.`);
    }
  }
}

async function adjustStock(item, type, creditNoteId, decoded, session) {
  const qty = Number(item.quantity);
  if (qty <= 0) return;

  const itemId = new Types.ObjectId(item.item);
  const warehouseId = new Types.ObjectId(item.warehouse);
  const companyId = new Types.ObjectId(decoded.companyId);

  let inventoryDoc = await Inventory.findOne({
    item: itemId,
    warehouse: warehouseId,
    companyId,
  }).session(session);

  if (!inventoryDoc) {
    inventoryDoc = await Inventory.create(
      [{ item: itemId, warehouse: warehouseId, companyId, quantity: 0, batches: [] }],
      { session }
    );
    inventoryDoc = inventoryDoc[0];
  }

  inventoryDoc.quantity += type === "IN" ? qty : -qty;
  if (inventoryDoc.quantity < 0) inventoryDoc.quantity = 0;
  await inventoryDoc.save({ session });

  await StockMovement.create(
    [{
      item: itemId,
      warehouse: warehouseId,
      companyId,
      movementType: type,
      quantity: qty,
      reference: creditNoteId,
      referenceType: "CreditNote",
      remarks: `Stock ${type} for Credit Note ${creditNoteId}`,
      createdBy: new Types.ObjectId(decoded.id),
    }],
    { session }
  );
}

// ✅ GET single Credit Note
export async function GET(req, { params }) {
  await dbConnect();
  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized: No token provided");
    const decoded = verifyJWT(token);

    const { id } = params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
    }

    const creditNote = await CreditNote.findOne({
      _id: id,
      companyId: decoded.companyId,
    });

    if (!creditNote) {
      return NextResponse.json({ success: false, error: "Credit Note not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: creditNote }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ✅ PUT: Update Credit Note
export async function PUT(req, { params }) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const { id } = params;
    if (!Types.ObjectId.isValid(id)) throw new Error("Invalid Credit Note ID");

    const { fields, files } = await parseForm(req);
    const creditData = JSON.parse(fields.creditMemoData || "{}");
    validateItems(creditData.items);

    const existing = await CreditNote.findOne({ _id: id, companyId: decoded.companyId });
    if (!existing) throw new Error("Credit Note not found");

    // Handle attachments
    const removedAttachmentIds = JSON.parse(fields.removedAttachmentIds || "[]");
    if (removedAttachmentIds.length) {
      await deleteFiles(removedAttachmentIds);
      existing.attachments = existing.attachments.filter(att => !removedAttachmentIds.includes(att.publicId));
    }

    const newFiles = await uploadFiles(files.newAttachments || [], "credit-notes", decoded.companyId);
    existing.attachments = [...existing.attachments, ...newFiles];

    Object.assign(existing, creditData);
    await existing.save({ session });

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ success: true, data: existing }, { status: 200 });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ✅ DELETE: Remove Credit Note
export async function DELETE(req, { params }) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const { id } = params;
    if (!Types.ObjectId.isValid(id)) throw new Error("Invalid Credit Note ID");

    const creditNote = await CreditNote.findOne({ _id: id, companyId: decoded.companyId });
    if (!creditNote) throw new Error("Credit Note not found");

    // Reverse stock impact
    for (const item of creditNote.items) {
      if (item.stockImpact) {
        await adjustStock(item, "OUT", creditNote._id, decoded, session);
      }
    }

    // Delete attachments
    const publicIds = creditNote.attachments.map(a => a.publicId);
    if (publicIds.length) await deleteFiles(publicIds);

    await CreditNote.deleteOne({ _id: id }, { session });

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ success: true, message: "Credit Note deleted" }, { status: 200 });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
