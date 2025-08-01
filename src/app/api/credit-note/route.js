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
import Counter from "@/models/Counter";

// ✅ Disable Next.js default body parser
export const config = { api: { bodyParser: false } };
export const dynamic = "force-dynamic";

// ✅ Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Convert request for formidable
function createNodeCompatibleRequest(req) {
  const nodeReq = Readable.fromWeb(req.body);
  nodeReq.headers = Object.fromEntries(req.headers.entries());
  nodeReq.method = req.method;
  return nodeReq;
}

// ✅ Parse form-data
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

// ✅ Upload files to Cloudinary
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
        uploadedAt: new Date(),
      };
    })
  );
}

// ✅ Delete Cloudinary files
async function deleteFiles(publicIds) {
  if (!Array.isArray(publicIds) || !publicIds.length) return;
  await cloudinary.api.delete_resources(publicIds);
}

// ✅ Validate items
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

// ✅ Stock Adjustment for Items
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
    [inventoryDoc] = await Inventory.create(
      [{ item: itemId, warehouse: warehouseId, companyId, quantity: 0, batches: [] }],
      { session }
    );
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

// ✅ POST: Create Credit Note
export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized: No token provided");
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) throw new Error("Unauthorized: Invalid token");

    const { fields, files } = await parseForm(req);
    const creditData = JSON.parse(fields.creditMemoData || "{}");

    validateItems(creditData.items);

    creditData.companyId = new Types.ObjectId(decoded.companyId);
    creditData.createdBy = new Types.ObjectId(decoded.id);
    creditData.postingDate = new Date(creditData.postingDate);
    creditData.validUntil = new Date(creditData.validUntil);
    creditData.documentDate = new Date(creditData.documentDate);

    const uploadedFiles = await uploadFiles(files.newAttachments || [], "credit-notes", decoded.companyId);
    creditData.attachments = uploadedFiles;

    // 🔢 Generate document number
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const fyStart = currentMonth < 4 ? currentYear - 1 : currentYear;
    const fyEnd = fyStart + 1;
    const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
    const key = `CreditNote-${financialYear}`;

    let counter = await Counter.findOne({ id: key, companyId: decoded.companyId }).session(session);
    if (!counter) {
      [counter] = await Counter.create(
        [{ id: key, companyId: decoded.companyId, seq: 1 }],
        { session }
      );
    } else {
      counter.seq += 1;
      await counter.save({ session });
    }

    const paddedSeq = String(counter.seq).padStart(5, "0");
    creditData.documentNumberCreditNote = `SALES-CRENOTE/${financialYear}/${paddedSeq}`;

    const [creditNote] = await CreditNote.create([creditData], { session });

    for (const item of creditData.items) {
      if (item.stockImpact) {
        await adjustStock(item, "IN", creditNote._id, decoded, session);
      }
    }

    await session.commitTransaction();
    return NextResponse.json({ success: true, data: creditNote }, { status: 201 });

  } catch (error) {
    await session.abortTransaction();
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  } finally {
    session.endSession();
  }
}

// ✅ GET: Fetch all Credit Notes (with auth)
export async function GET(req) {
  await dbConnect();
  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized: No token provided");
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) throw new Error("Unauthorized: Invalid token");

    const creditNotes = await CreditNote.find({ companyId: decoded.companyId }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: creditNotes }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


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
// import Counter from "@/models/Counter";

// // ✅ Disable Next.js default body parser
// export const config = { api: { bodyParser: false } };
// export const dynamic = "force-dynamic";

// // ✅ Cloudinary Config
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // ✅ Convert request for formidable
// function createNodeCompatibleRequest(req) {
//   const nodeReq = Readable.fromWeb(req.body);
//   nodeReq.headers = Object.fromEntries(req.headers.entries());
//   nodeReq.method = req.method;
//   return nodeReq;
// }

// // ✅ Parse form-data
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

// // ✅ Upload files to Cloudinary
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

// // ✅ Delete Cloudinary files
// async function deleteFiles(publicIds) {
//   if (!Array.isArray(publicIds) || !publicIds.length) return;
//   await cloudinary.api.delete_resources(publicIds);
// }

// // ✅ Validate items
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

// // ✅ Stock Adjustment for Items
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

// // ✅ POST: Create Credit Note
// export async function POST(req) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) throw new Error("Unauthorized: No token provided");
//     const decoded = verifyJWT(token);

//     const { fields, files } = await parseForm(req);
//     const creditData = JSON.parse(fields.creditMemoData || "{}");
//     validateItems(creditData.items);

//     // Convert dates and IDs
//     creditData.postingDate = new Date(creditData.postingDate);
//     creditData.validUntil = new Date(creditData.validUntil);
//     creditData.documentDate = new Date(creditData.documentDate);
//     creditData.companyId = new Types.ObjectId(decoded.companyId);
//     creditData.createdBy = new Types.ObjectId(decoded.id);

//     const uploadedFiles = await uploadFiles(files.newAttachments || [], "credit-notes", decoded.companyId);
//     creditData.attachments = uploadedFiles;

//    const now = new Date();
//        const currentYear = now.getFullYear();
//        const currentMonth = now.getMonth() + 1;
//        let fyStart = currentYear;
//        let fyEnd = currentYear + 1;
//        if (currentMonth < 4) {
//          fyStart = currentYear - 1;
//          fyEnd = currentYear;
//        }
//        const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
//        const key = `SalesInvoice-${financialYear}`;
   
//        let counter = await Counter.findOne({
//          id: key,
//          companyId: user.companyId,
//        }).session(session);
   
//        if (!counter) {
//          [counter] = await Counter.create(
//            [{ id: key, companyId: user.companyId, seq: 1 }],
//            { session }
//          );
//        } else {
//          counter.seq += 1;
//          await counter.save({ session });
//        }
   
//        const paddedSeq = String(counter.seq).padStart(5, "0");
//        creditData.documentNumberCreditNote = `SALES-CRENOTE/${financialYear}/${paddedSeq}`;
   


//     const [creditNote] = await CreditNote.create([creditData], { session });

//     for (const item of creditData.items) {
//       if (item.stockImpact) {
//         await adjustStock(item, "IN", creditNote._id, decoded, session);
//       }
//     }

//     await session.commitTransaction();
//     return NextResponse.json({ success: true, data: creditNote }, { status: 201 });
//   } catch (error) {
//     await session.abortTransaction();
//     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
//   } finally {
//     session.endSession();
//   }
// }

// // ✅ GET: Fetch all Credit Notes for logged-in company
// export async function GET(req) {
//   await dbConnect();
//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) throw new Error("Unauthorized: No token provided");
//     const decoded = verifyJWT(token);

//     const creditNotes = await CreditNote.find({ companyId: decoded.companyId }).sort({ createdAt: -1 });
//     return NextResponse.json({ success: true, data: creditNotes }, { status: 200 });
//   } catch (error) {
//     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
//   }
// }
