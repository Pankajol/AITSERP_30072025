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
import jwt from "jsonwebtoken";


export const dynamic = "force-dynamic";

const SECRET = process.env.JWT_SECRET;

// ─── Helper ───


// ── Auth: reads token all possible ways + debug logs ──
// function auth(req) {
//   console.log("=== AUTH DEBUG ===");
//   console.log("Has .get fn:", typeof req.headers.get === "function");

//   let header = null;

//   if (typeof req.headers.get === "function") {
//     header = req.headers.get("authorization") ?? req.headers.get("Authorization") ?? null;
//     console.log("Via .get():", header ? header.substring(0, 30) + "..." : "NULL");
//   }

//   if (!header) {
//     header = req.headers["authorization"] ?? req.headers["Authorization"] ?? null;
//     console.log("Via []:", header ? header.substring(0, 30) + "..." : "NULL");
//   }

//   if (!header) {
//     try {
//       if (typeof req.headers.entries === "function") {
//         console.log("All header keys:", Object.keys(Object.fromEntries(req.headers.entries())));
//       }
//     } catch (_) {}
//     throw new Error("Unauthorized: No token provided");
//   }

//   const token = header.startsWith("Bearer ") ? header.slice(7) : header;
//   try {
//     return jwt.verify(token, SECRET);
//   } catch (err) {
//     if (err.name === "TokenExpiredError") throw new Error("Unauthorized: Token expired");
//     throw new Error("Unauthorized: Invalid token");
//   }
// }

// ── Cloudinary ──
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function createNodeReq(req) {
  const nodeReq = Readable.fromWeb(req.body);
  nodeReq.headers = Object.fromEntries(req.headers.entries());
  nodeReq.method  = req.method;
  return nodeReq;
}

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form    = formidable({ multiples: true, keepExtensions: true });
    const nodeReq = createNodeReq(req);
    form.parse(nodeReq, (err, fields, files) => {
      if (err) return reject(err);
      const f = {};
      for (const k in fields) f[k] = Array.isArray(fields[k]) ? fields[k][0] : fields[k];
      const fl = {};
      for (const k in files) fl[k] = Array.isArray(files[k]) ? files[k] : [files[k]];
      resolve({ fields: f, files: fl });
    });
  });
}

async function uploadFiles(fileObjects, companyId) {
  if (!fileObjects?.length) return [];
  return Promise.all(fileObjects.map(async (file) => {
    const result = await cloudinary.uploader.upload(file.filepath, {
      folder: `credit-notes/${companyId || "default"}`,
      resource_type: "auto",
    });
    return {
      fileName: file.originalFilename || result.original_filename,
      fileUrl:  result.secure_url,
      fileType: file.mimetype,
      publicId: result.public_id,
    };
  }));
}

async function deleteFiles(publicIds) {
  if (!publicIds?.length) return;
  await cloudinary.api.delete_resources(publicIds);
}

async function adjustStock(item, type, refId, decoded, session) {
  const qty = Number(item.quantity);
  if (qty <= 0) return;
  const itemId      = new Types.ObjectId(item.item);
  const warehouseId = new Types.ObjectId(item.warehouse);
  const companyId   = new Types.ObjectId(decoded.companyId);

  let inv = await Inventory.findOne({ item: itemId, warehouse: warehouseId, companyId }).session(session);
  if (!inv) {
    [inv] = await Inventory.create(
      [{ item: itemId, warehouse: warehouseId, companyId, quantity: 0, batches: [] }],
      { session }
    );
  }
  inv.quantity += type === "IN" ? qty : -qty;
  if (inv.quantity < 0) inv.quantity = 0;
  await inv.save({ session });

  await StockMovement.create([{
    item: itemId, warehouse: warehouseId, companyId,
    movementType: type, quantity: qty,
    reference: refId, referenceType: "CreditNote",
    remarks:   `Stock ${type} for CreditNote ${refId}`,
    createdBy: new Types.ObjectId(decoded.id),
  }], { session });
}

// ─────────────────────────────────────────
// GET  /api/credit-note/[id]
// ─────────────────────────────────────────
export async function GET(req, context) {
  await dbConnect();
  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized: No token provided.");
    const decoded = verifyJWT(token);
    const companyId = decoded?.companyId;
    if (!decoded?.id || !companyId) throw new Error("Unauthorized: Invalid token.");
    const { id } = context.params;
    if (!Types.ObjectId.isValid(id))      return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });

    const doc = await CreditNote.findOne({ _id: id, companyId: decoded.companyId });
    if (!doc) return NextResponse.json({ success: false, error: "Credit Note not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: doc }, { status: 200 });
  } catch (err) {
    console.error("GET /credit-note/[id]:", err.message);
    const status = err.message.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

// ─────────────────────────────────────────
// PUT  /api/credit-note/[id]
// ─────────────────────────────────────────
export async function PUT(req, context) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized: No token provided.");
    const decoded = verifyJWT(token);
    const companyId = decoded?.companyId;
    if (!decoded?.id || !companyId) throw new Error("Unauthorized: Invalid token.");
    const { id } = context.params;
    if (!Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });

    const { fields, files } = await parseForm(req);
    const raw = fields.creditNoteData || fields.memoData;
    if (!raw) throw new Error("Missing creditNoteData payload.");

    const data = JSON.parse(raw);
    if (!Array.isArray(data.items) || !data.items.length) throw new Error("Credit Note must have at least one item.");
    const existing = await CreditNote.findOne({ _id: id, companyId: decoded.companyId }).session(session);
    if (!existing) throw new Error("Credit Note not found");
    for (const item of existing.items) await adjustStock(item, "OUT", existing._id, decoded, session);

    const removedFiles = data.removedFiles || [];
    await deleteFiles(removedFiles.map(f => f.publicId).filter(Boolean));
    const newFiles  = await uploadFiles(files.newFiles || [], decoded.companyId);
    const keptFiles = (existing.attachments || []).filter(f => !removedFiles.some(r => r.publicId === f.publicId));
    const normalizedItems = data.items.map(i => ({
      ...i,
      item:      typeof i.item      === "object" ? i.item._id      ?? i.item      : i.item,
      warehouse: typeof i.warehouse === "object" ? i.warehouse._id ?? i.warehouse : i.warehouse,
    }));
    Object.assign(existing, {
      ...data,
      items:       normalizedItems,
      attachments: [...keptFiles, ...newFiles],
      companyId:   decoded.companyId,
      updatedAt:   new Date(),
    });
    await existing.save({ session });
    for (const item of normalizedItems) await adjustStock(item, "IN", existing._id, decoded, session);
    await session.commitTransaction();
    return NextResponse.json({ success: true, data: existing }, { status: 200 });
  } catch (err) {
    await session.abortTransaction();
    console.error("PUT /credit-note/[id]:", err.message);
    const status = err.message.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json({ success: false, message: err.message }, { status });
  } finally {
    session.endSession();
  }
}

// ─────────────────────────────────────────
// DELETE  /api/credit-note/[id]
// ────────────────────────────────────────
export async function DELETE(req, context) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized: No token provided.");
    const decoded = verifyJWT(token);
    const companyId = decoded?.companyId;
    if (!decoded?.id || !companyId) throw new Error("Unauthorized: Invalid token.");
    const { id } = context.params;
    if (!Types.ObjectId.isValid(id)) return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });

    const doc = await CreditNote.findOne({ _id: id, companyId: decoded.companyId }).session(session);
    if (!doc) throw new Error("Credit Note not found");

    for (const item of doc.items) await adjustStock(item, "OUT", doc._id, decoded, session);
    const publicIds = (doc.attachments || []).map(f => f.publicId).filter(Boolean);
    await deleteFiles(publicIds);
    await CreditNote.deleteOne({ _id: id }).session(session);
    await session.commitTransaction();
    return NextResponse.json({ success: true, message: "Credit Note deleted" }, { status: 200 });
  } catch (err) {
    await session.abortTransaction();
    console.error("DELETE /credit-note/[id]:", err.message);
    const status = err.message.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json({ success: false, message: err.message }, { status });
  } finally {
    session.endSession();
  }
}



// // ─────────────────────────────────────────
// // GET  /api/credit-note/[id]
// // ─────────────────────────────────────────
// export async function GET(req, context) {
//   await dbConnect();
//   try {
//       const token = getTokenFromHeader(req);
//     if (!token) throw new Error("Unauthorized: No token provided.");
//     const decoded = verifyJWT(token);
//     const companyId = decoded?.companyId;
//     if (!decoded?.id || !companyId) throw new Error("Unauthorized: Invalid token.");

//     if (!Types.ObjectId.isValid(id))
//       return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });

//     const doc = await CreditNote.findOne({ _id: id, companyId: decoded.companyId });
//     if (!doc)
//       return NextResponse.json({ success: false, error: "Credit Note not found" }, { status: 404 });

//     return NextResponse.json({ success: true, data: doc }, { status: 200 });
//   } catch (err) {
//     console.error("GET /credit-note/[id]:", err.message);
//     const status = err.message.startsWith("Unauthorized") ? 401 : 500;
//     return NextResponse.json({ success: false, error: err.message }, { status });
//   }
// }

// // ─────────────────────────────────────────
// // PUT  /api/credit-note/[id]
// // ─────────────────────────────────────────
// export async function PUT(req, context) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//           const token = getTokenFromHeader(req);
//           if (!token) throw new Error("Unauthorized: No token provided.");
//           const decoded = verifyJWT(token);
//           const companyId = decoded?.companyId;
//           if (!decoded?.id || !companyId) throw new Error("Unauthorized: Invalid token.");

//     if (!Types.ObjectId.isValid(id))
//       return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });

//     const { fields, files } = await parseForm(req);
//     const raw = fields.creditNoteData || fields.memoData;
//     if (!raw) throw new Error("Missing creditNoteData payload.");

//     const data = JSON.parse(raw);
//     if (!Array.isArray(data.items) || !data.items.length)
//       throw new Error("Credit Note must have at least one item.");

//     const existing = await CreditNote.findOne({ _id: id, companyId: decoded.companyId }).session(session);
//     if (!existing) throw new Error("Credit Note not found");

//     for (const item of existing.items) await adjustStock(item, "OUT", existing._id, decoded, session);

//     const removedFiles = data.removedFiles || [];
//     await deleteFiles(removedFiles.map(f => f.publicId).filter(Boolean));

//     const newFiles  = await uploadFiles(files.newFiles || [], decoded.companyId);
//     const keptFiles = (existing.attachments || []).filter(
//       f => !removedFiles.some(r => r.publicId === f.publicId)
//     );

//     const normalizedItems = data.items.map(i => ({
//       ...i,
//       item:      typeof i.item      === "object" ? i.item._id      ?? i.item      : i.item,
//       warehouse: typeof i.warehouse === "object" ? i.warehouse._id ?? i.warehouse : i.warehouse,
//     }));

//     Object.assign(existing, {
//       ...data,
//       items:       normalizedItems,
//       attachments: [...keptFiles, ...newFiles],
//       companyId:   decoded.companyId,
//       updatedAt:   new Date(),
//     });
//     await existing.save({ session });

//     for (const item of normalizedItems) await adjustStock(item, "IN", existing._id, decoded, session);

//     await session.commitTransaction();
//     return NextResponse.json({ success: true, data: existing }, { status: 200 });
//   } catch (err) {
//     await session.abortTransaction();
//     console.error("PUT /credit-note/[id]:", err.message);
//     const status = err.message.startsWith("Unauthorized") ? 401 : 500;
//     return NextResponse.json({ success: false, message: err.message }, { status });
//   } finally {
//     session.endSession();
//   }
// }

// // ─────────────────────────────────────────
// // DELETE  /api/credit-note/[id]
// // ─────────────────────────────────────────
// export async function DELETE(req, context) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//      const token = getTokenFromHeader(req);
//     if (!token) throw new Error("Unauthorized: No token provided.");
//     const decoded = verifyJWT(token);
//     const companyId = decoded?.companyId;
//     if (!decoded?.id || !companyId) throw new Error("Unauthorized: Invalid token.");

//     if (!Types.ObjectId.isValid(id))
//       return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });

//     const doc = await CreditNote.findOne({ _id: id, companyId: decoded.companyId }).session(session);
//     if (!doc) throw new Error("Credit Note not found");

//     for (const item of doc.items) await adjustStock(item, "OUT", doc._id, decoded, session);

//     const publicIds = (doc.attachments || []).map(f => f.publicId).filter(Boolean);
//     await deleteFiles(publicIds);

//     await CreditNote.deleteOne({ _id: id }).session(session);

//     await session.commitTransaction();
//     return NextResponse.json({ success: true, message: "Credit Note deleted" }, { status: 200 });
//   } catch (err) {
//     await session.abortTransaction();
//     console.error("DELETE /credit-note/[id]:", err.message);
//     const status = err.message.startsWith("Unauthorized") ? 401 : 500;
//     return NextResponse.json({ success: false, message: err.message }, { status });
//   } finally {
//     session.endSession();
//   }
// }

// import { NextResponse } from "next/server";
// import mongoose, { Types } from "mongoose";
// import { v2 as cloudinary } from "cloudinary";
// import formidable from "formidable";
// import { Readable } from "stream";
// import dbConnect from "@/lib/db";
// import CreditNote from "@/models/CreditMemo";
// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// export const config = { api: { bodyParser: false } };
// export const dynamic = "force-dynamic";

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// function createNodeCompatibleRequest(req) {
//   const nodeReq = Readable.fromWeb(req.body);
//   nodeReq.headers = Object.fromEntries(req.headers.entries());
//   nodeReq.method = req.method;
//   return nodeReq;
// }

// async function parseForm(req) {
//   return new Promise((resolve, reject) => {
//     const form = formidable({ multiples: true, keepExtensions: true });
//     const nodeReq = createNodeCompatibleRequest(req);

//     form.parse(nodeReq, (err, fields, files) => {
//       if (err) return reject(err);

//       const parsedFields = {};
//       for (const key in fields) {
//         parsedFields[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
//       }

//       const parsedFiles = {};
//       for (const key in files) {
//         parsedFiles[key] = Array.isArray(files[key]) ? files[key] : [files[key]];
//       }

//       resolve({ fields: parsedFields, files: parsedFiles });
//     });
//   });
// }

// async function uploadFiles(fileObjects, folderName, companyId) {
//   if (!fileObjects || !fileObjects.length) return [];
//   return await Promise.all(
//     fileObjects.map(async (file) => {
//       const result = await cloudinary.uploader.upload(file.filepath, {
//         folder: `${folderName}/${companyId || "default_company"}`,
//         resource_type: "auto",
//       });
//       return {
//         fileName: file.originalFilename || result.original_filename,
//         fileUrl: result.secure_url,
//         fileType: file.mimetype,
//         publicId: result.public_id,
//       };
//     })
//   );
// }

// async function deleteFiles(publicIds) {
//   if (!Array.isArray(publicIds) || !publicIds.length) return;
//   await cloudinary.api.delete_resources(publicIds);
// }

// function validateItems(items) {
//   if (!Array.isArray(items) || !items.length) {
//     throw new Error("Credit Note must have at least one item.");
//   }
//   for (const [i, item] of items.entries()) {
//     if (!item.item || !item.warehouse || item.quantity <= 0) {
//       throw new Error(`Item at row ${i + 1} is invalid.`);
//     }
//   }
// }

// async function adjustStock(item, type, creditNoteId, decoded, session) {
//   const qty = Number(item.quantity);
//   if (qty <= 0) return;

//   const itemId = new Types.ObjectId(item.item);
//   const warehouseId = new Types.ObjectId(item.warehouse);
//   const companyId = new Types.ObjectId(decoded.companyId);

//   let inventoryDoc = await Inventory.findOne({
//     item: itemId,
//     warehouse: warehouseId,
//     companyId,
//   }).session(session);

//   if (!inventoryDoc) {
//     inventoryDoc = await Inventory.create(
//       [{ item: itemId, warehouse: warehouseId, companyId, quantity: 0, batches: [] }],
//       { session }
//     );
//     inventoryDoc = inventoryDoc[0];
//   }

//   inventoryDoc.quantity += type === "IN" ? qty : -qty;
//   if (inventoryDoc.quantity < 0) inventoryDoc.quantity = 0;
//   await inventoryDoc.save({ session });

//   await StockMovement.create(
//     [{
//       item: itemId,
//       warehouse: warehouseId,
//       companyId,
//       movementType: type,
//       quantity: qty,
//       reference: creditNoteId,
//       referenceType: "CreditNote",
//       remarks: `Stock ${type} for Credit Note ${creditNoteId}`,
//       createdBy: new Types.ObjectId(decoded.id),
//     }],
//     { session }
//   );
// }

// // ✅ GET single Credit Note
// export async function GET(req, { params }) {
//   await dbConnect();
  
//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) throw new Error("Unauthorized: No token provided");
//     const decoded = verifyJWT(token);

//    const { id } = await context.params;
//     if (!Types.ObjectId.isValid(id)) {
//       return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
//     }

//     const creditNote = await CreditNote.findOne({
//       _id: id,
//       companyId: decoded.companyId,
//     });

//     if (!creditNote) {
//       return NextResponse.json({ success: false, error: "Credit Note not found" }, { status: 404 });
//     }

//     return NextResponse.json({ success: true, data: creditNote }, { status: 200 });
//   } catch (error) {
//     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
//   }
// }

// // ✅ PUT: Update Credit Note
// export async function PUT(req, { params }) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const token = getTokenFromHeader(req);
//     const decoded = verifyJWT(token);

//     const { id } = params;
//     if (!Types.ObjectId.isValid(id)) throw new Error("Invalid Credit Note ID");

//     const { fields, files } = await parseForm(req);
//     const creditData = JSON.parse(fields.creditMemoData || "{}");
//     validateItems(creditData.items);

//     const existing = await CreditNote.findOne({ _id: id, companyId: decoded.companyId });
//     if (!existing) throw new Error("Credit Note not found");

//     // Handle attachments
//     const removedAttachmentIds = JSON.parse(fields.removedAttachmentIds || "[]");
//     if (removedAttachmentIds.length) {
//       await deleteFiles(removedAttachmentIds);
//       existing.attachments = existing.attachments.filter(att => !removedAttachmentIds.includes(att.publicId));
//     }

//     const newFiles = await uploadFiles(files.newAttachments || [], "credit-notes", decoded.companyId);
//     existing.attachments = [...existing.attachments, ...newFiles];

//     Object.assign(existing, creditData);
//     await existing.save({ session });

//     await session.commitTransaction();
//     session.endSession();

//     return NextResponse.json({ success: true, data: existing }, { status: 200 });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
//   }
// }

// // ✅ DELETE: Remove Credit Note
// export async function DELETE(req, { params }) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const token = getTokenFromHeader(req);
//     const decoded = verifyJWT(token);

//     const { id } = params;
//     if (!Types.ObjectId.isValid(id)) throw new Error("Invalid Credit Note ID");

//     const creditNote = await CreditNote.findOne({ _id: id, companyId: decoded.companyId });
//     if (!creditNote) throw new Error("Credit Note not found");

//     // Reverse stock impact
//     for (const item of creditNote.items) {
//       if (item.stockImpact) {
//         await adjustStock(item, "OUT", creditNote._id, decoded, session);
//       }
//     }

//     // Delete attachments
//     const publicIds = creditNote.attachments.map(a => a.publicId);
//     if (publicIds.length) await deleteFiles(publicIds);

//     await CreditNote.deleteOne({ _id: id }, { session });

//     await session.commitTransaction();
//     session.endSession();

//     return NextResponse.json({ success: true, message: "Credit Note deleted" }, { status: 200 });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
//   }
// }
