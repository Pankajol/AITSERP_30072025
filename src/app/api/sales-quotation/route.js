import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import dbConnect from "@/lib/db";
import SalesQuotation from "@/models/SalesQuotationModel";
import Customer from "@/models/CustomerModel";
import ItemModels from "@/models/ItemModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Counter from "@/models/Counter";
import { checkPermission } from "@/lib/checkPermission";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = { api: { bodyParser: false } };

// ──────────────────────────────────────────────────────────────
// Helper: parse form data
async function parseForm(req) {
  const formData = await req.formData();
  const jsonData = JSON.parse(formData.get("quotationData"));
  const files = formData.getAll("attachments");
  return { jsonData, files };
}

// ──────────────────────────────────────────────────────────────
// ─── POST (Create)
// ──────────────────────────────────────────────────────────────
export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  let committed = false;

  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized: No token");
    await checkPermission(req, "Sales Quotation", "create");

    const decoded = verifyJWT(token);
    if (!decoded?.companyId) throw new Error("Invalid token");

    const { jsonData, files } = await parseForm(req);

    if (!jsonData.customer || !mongoose.Types.ObjectId.isValid(jsonData.customer))
      throw new Error("Valid customer ID required");
    if (!Array.isArray(jsonData.items) || jsonData.items.length === 0)
      throw new Error("At least one item required");

    // Clean warehouse fields (convert empty string to null)
    jsonData.items = jsonData.items.map(item => ({
      ...item,
      warehouse: item.warehouse && item.warehouse !== "" ? item.warehouse : null,
      warehouseName: item.warehouseName || "",
      warehouseCode: item.warehouseCode || "",
    }));

    // Upload attachments
    const uploadedFiles = [];
    for (const file of files) {
      if (!file.size) continue;
      const buffer = await file.arrayBuffer();
      const uploadRes = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "sales-quotations", resource_type: "auto" },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(Buffer.from(buffer));
      });
      uploadedFiles.push({
        fileName: file.name,
        fileType: file.type,
        fileUrl: uploadRes.secure_url,
        publicId: uploadRes.public_id,
        uploadedAt: new Date(),
      });
    }

    const existingFiles = jsonData.existingFiles || [];
    jsonData.attachments = [...existingFiles, ...uploadedFiles];
    delete jsonData.existingFiles;
    delete jsonData.removedFiles;

    // Generate document number
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    let fyStart = currentYear, fyEnd = currentYear + 1;
    if (currentMonth < 4) {
      fyStart = currentYear - 1;
      fyEnd = currentYear;
    }
    const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
    const key = "SalesQuotation";

    let counter = await Counter.findOne({ id: key, companyId: decoded.companyId }).session(session);
    if (!counter) {
      const [created] = await Counter.create([{ id: key, companyId: decoded.companyId, seq: 1 }], { session });
      counter = created;
    } else {
      counter.seq += 1;
      await counter.save({ session });
    }

    jsonData.documentNumberQuatation = `SALES-QUA/${financialYear}/${String(counter.seq).padStart(5, "0")}`;
    jsonData.companyId = decoded.companyId;
    jsonData.createdBy = decoded.id;
    delete jsonData._id;

    const [quotation] = await SalesQuotation.create([jsonData], { session });

    await session.commitTransaction();
    committed = true;
    session.endSession();

    const populated = await SalesQuotation.findById(quotation._id)
      .populate("customer", "customerCode customerName contactPerson")
      .populate("items.item", "itemCode itemName unitPrice imageUrl variants");

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (error) {
    if (!committed) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error("POST /api/sales-quotation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────
// ─── GET (list or single)
// ──────────────────────────────────────────────────────────────
export async function GET(req) {
  try {
    await dbConnect();
    await checkPermission(req, "Sales Quotation", "view");

    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const companyId = decoded.companyId;

    // Single quotation by ID
    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
      }
      const quotation = await SalesQuotation.findOne({ _id: id, companyId })
        .populate("customer", "customerCode customerName contactPerson")
        .populate("items.item", "itemCode itemName unitPrice imageUrl variants")
        .populate("items.warehouse", "warehouseName warehouseCode");
      if (!quotation) {
        return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: quotation });
    }

    // Build query for list
    const query = { companyId };
    
    // Filter by status
    if (status && status !== "All" && status !== "") {
      query.status = status;
    }
    
    // Search by customer name, document number, or reference number
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { documentNumberQuatation: { $regex: search, $options: "i" } },
        { refNumber: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [quotations, total] = await Promise.all([
      SalesQuotation.find(query)
        .populate("customer", "customerCode customerName contactPerson")
        .populate("items.item", "itemCode itemName unitPrice imageUrl")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SalesQuotation.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: quotations,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/sales-quotation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
// ──────────────────────────────────────────────────────────────
// ─── PUT (Update)
// ──────────────────────────────────────────────────────────────
export async function PUT(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  let committed = false;

  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized");
    await checkPermission(req, "Sales Quotation", "update");

    const decoded = verifyJWT(token);
    if (!decoded?.companyId) throw new Error("Invalid token");

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Valid ID required" }, { status: 400 });
    }

    const { jsonData, files } = await parseForm(req);

    // Find existing quotation
    const existing = await SalesQuotation.findOne({ _id: id, companyId: decoded.companyId }).session(session);
    if (!existing) throw new Error("Quotation not found");

    // Clean warehouse fields
    jsonData.items = jsonData.items.map(item => ({
      ...item,
      warehouse: item.warehouse && item.warehouse !== "" ? item.warehouse : null,
    }));

    // Handle attachments
    const removedPublicIds = jsonData.removedFiles?.map(f => f.publicId) || [];
    const existingFiles = jsonData.existingFiles || [];

    // Delete removed files from Cloudinary
    for (const publicId of removedPublicIds) {
      await cloudinary.uploader.destroy(publicId).catch(e => console.warn(e));
    }

    const newUploadedFiles = [];
    for (const file of files) {
      if (!file.size) continue;
      const buffer = await file.arrayBuffer();
      const uploadRes = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "sales-quotations", resource_type: "auto" },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(Buffer.from(buffer));
      });
      newUploadedFiles.push({
        fileName: file.name,
        fileType: file.type,
        fileUrl: uploadRes.secure_url,
        publicId: uploadRes.public_id,
        uploadedAt: new Date(),
      });
    }

    jsonData.attachments = [
      ...existingFiles.filter(f => !removedPublicIds.includes(f.publicId)),
      ...newUploadedFiles,
    ];
    delete jsonData.existingFiles;
    delete jsonData.removedFiles;
    delete jsonData._id;

    const updated = await SalesQuotation.findByIdAndUpdate(id, jsonData, { new: true, session })
      .populate("customer", "customerCode customerName contactPerson")
      .populate("items.item", "itemCode itemName unitPrice imageUrl variants")
      .populate("items.warehouse", "warehouseName warehouseCode");

    await session.commitTransaction();
    committed = true;
    session.endSession();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (!committed) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error("PUT /api/sales-quotation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ──────────────────────────────────────────────────────────────
// ─── DELETE
// ──────────────────────────────────────────────────────────────
export async function DELETE(req) {
  try {
    await dbConnect();
    await checkPermission(req, "Sales Quotation", "delete");

    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Valid ID required" }, { status: 400 });
    }

    const quotation = await SalesQuotation.findOne({ _id: id, companyId: decoded.companyId });
    if (!quotation) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    // Delete Cloudinary attachments
    for (const att of quotation.attachments || []) {
      if (att.publicId) await cloudinary.uploader.destroy(att.publicId).catch(e => console.warn(e));
    }

    await SalesQuotation.deleteOne({ _id: id, companyId: decoded.companyId });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (error) {
    console.error("DELETE /api/sales-quotation error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}




// import Customer from "@/models/CustomerModel";
// import ItemModels from "@/models/ItemModels";
// import { NextResponse } from "next/server";
// import mongoose from "mongoose";
// import { v2 as cloudinary } from "cloudinary";
// import dbConnect from "@/lib/db";
// import SalesQuotation from "@/models/SalesQuotationModel";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import Counter from "@/models/Counter";
// import { checkPermission } from "@/lib/checkPermission";

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// export const config = { api: { bodyParser: false } };

// export async function POST(req) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const token = getTokenFromHeader(req);
//     checkPermission(req, "Sales Quotation", "create");
//     if (!token) throw new Error("Unauthorized: No token provided");

//     const decoded = verifyJWT(token);
//     if (!decoded || !decoded.companyId) throw new Error("Unauthorized: Invalid token");

//     const companyId = decoded.companyId;
//     if (!mongoose.isValidObjectId(companyId)) throw new Error("Invalid company ID");

//     const formData = await req.formData();
//     const jsonData = JSON.parse(formData.get("quotationData"));
//     const files = formData.getAll("attachments");

//     if (!jsonData.customer || !mongoose.isValidObjectId(jsonData.customer)) {
//       throw new Error("Valid customer ID required");
//     }
//         if (!Array.isArray(jsonData.items) || jsonData.items.length === 0) {
//       throw new Error("At least one item is required");
//     }

//     // -------------------------------------------------------------
//     // 🛠️ SANITIZE ITEM WAREHOUSES (CRITICAL FIX)
//     // -------------------------------------------------------------
//     jsonData.items = jsonData.items.map((item) => {
//       const clean = { ...item };

//       if (!clean.warehouse || clean.warehouse === "") {
//         delete clean.warehouse;
//       }

//       if (
//         typeof clean.warehouse === "string" &&
//         !mongoose.Types.ObjectId.isValid(clean.warehouse)
//       ) {
//         delete clean.warehouse;
//       }

//       return clean;
//     });


//     // ✅ Upload files to Cloudinary
//     const uploadedFiles = [];
//     for (const file of files) {
//       const buffer = await file.arrayBuffer();
//       const uploadRes = await new Promise((resolve, reject) => {
//         const stream = cloudinary.uploader.upload_stream(
//           { folder: "sales-quotations", resource_type: "auto" },
//           (err, result) => (err ? reject(err) : resolve(result))
//         );
//         stream.end(Buffer.from(buffer));
//       });

//       uploadedFiles.push({
//         fileName: file.name,
//         fileType: file.type,
//         fileUrl: uploadRes.secure_url,
//         cloudinaryId: uploadRes.public_id,
//       });
//     }

//     const finalAttachments = [...(jsonData.existingFiles || []), ...uploadedFiles];

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
//     const key = "SalesQuotation";

//     let counter = await Counter.findOne({ id: key, companyId }).session(session);
//     if (!counter) {
//       const [created] = await Counter.create([{ id: key, companyId, seq: 1 }], { session });
//       counter = created;
//     } else {
//       counter.seq += 1;
//       await counter.save({ session });
//     }

//     const paddedSeq = String(counter.seq).padStart(5, "0");
//     jsonData.documentNumberQuatation = `SALES-QUA/${financialYear}/${paddedSeq}`;

//     const [quotation] = await SalesQuotation.create([{ ...jsonData, companyId, attachments: finalAttachments, createdBy: decoded.id }], { session });

//     await session.commitTransaction();
//     session.endSession();

//     const populatedQuotation = await SalesQuotation.findById(quotation._id)
//       .populate("customer", "customerCode customerName contactPerson")
//       .populate("items.item", "itemCode itemName unitPrice");

//     return NextResponse.json({ success: true, data: populatedQuotation, message: "Sales Quotation created successfully" }, { status: 201 });
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("POST /api/sales-quotation error:", error);
//     return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
//   }
// }

// export async function GET(req) {
//   try {
//     await dbConnect();
//     checkPermission(req, "Sales Quotation", "view");

//     const token = getTokenFromHeader(req);
//     if (!token) {
//       return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
//     }

//     const decoded = verifyJWT(token);
//     if (!decoded) {
//       return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
//     }

//     const companyId = decoded.companyId;
//     if (!companyId || !mongoose.isValidObjectId(companyId)) {
//       return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 400 });
//     }

//     const quotations = await SalesQuotation.find({ companyId })
//       .populate("customer", "customerCode customerName contactPerson")
//       .populate("items.item", "itemCode itemName unitPrice")
//       .sort({ createdAt: -1 });

//     return NextResponse.json({ success: true, data: quotations }, { status: 200 });
//   } catch (error) {
//     console.error("GET /api/sales-quotation error:", error);
//     return NextResponse.json({ success: false, error: "Failed to fetch sales quotations" }, { status: 500 });
//   }
// }


