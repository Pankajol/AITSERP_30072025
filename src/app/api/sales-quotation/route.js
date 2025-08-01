import Customer from "@/models/CustomerModel";
import ItemModels from "@/models/ItemModels";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";
import dbConnect from "@/lib/db";
import SalesQuotation from "@/models/SalesQuotationModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Counter from "@/models/Counter";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = { api: { bodyParser: false } };

export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized: No token provided");

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.companyId) throw new Error("Unauthorized: Invalid token");

    const companyId = decoded.companyId;
    if (!mongoose.isValidObjectId(companyId)) throw new Error("Invalid company ID");

    const formData = await req.formData();
    const jsonData = JSON.parse(formData.get("quotationData"));
    const files = formData.getAll("attachments");

    if (!jsonData.customer || !mongoose.isValidObjectId(jsonData.customer)) {
      throw new Error("Valid customer ID required");
    }
    if (!Array.isArray(jsonData.items) || jsonData.items.length === 0) {
      throw new Error("At least one item is required");
    }

    // ✅ Upload files to Cloudinary
    const uploadedFiles = [];
    for (const file of files) {
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
        cloudinaryId: uploadRes.public_id,
      });
    }

    const finalAttachments = [...(jsonData.existingFiles || []), ...uploadedFiles];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    let fyStart = currentYear;
    let fyEnd = currentYear + 1;
    if (currentMonth < 4) {
      fyStart = currentYear - 1;
      fyEnd = currentYear;
    }
    const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
    const key = "SalesQuotation";

    let counter = await Counter.findOne({ id: key, companyId }).session(session);
    if (!counter) {
      const [created] = await Counter.create([{ id: key, companyId, seq: 1 }], { session });
      counter = created;
    } else {
      counter.seq += 1;
      await counter.save({ session });
    }

    const paddedSeq = String(counter.seq).padStart(5, "0");
    jsonData.documentNumberQuatation = `SALES-QUA/${financialYear}/${paddedSeq}`;

    const [quotation] = await SalesQuotation.create([{ ...jsonData, companyId, attachments: finalAttachments, createdBy: decoded.id }], { session });

    await session.commitTransaction();
    session.endSession();

    const populatedQuotation = await SalesQuotation.findById(quotation._id)
      .populate("customer", "customerCode customerName contactPerson")
      .populate("items.item", "itemCode itemName unitPrice");

    return NextResponse.json({ success: true, data: populatedQuotation, message: "Sales Quotation created successfully" }, { status: 201 });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("POST /api/sales-quotation error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    const companyId = decoded.companyId;
    if (!companyId || !mongoose.isValidObjectId(companyId)) {
      return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 400 });
    }

    const quotations = await SalesQuotation.find({ companyId })
      .populate("customer", "customerCode customerName contactPerson")
      .populate("items.item", "itemCode itemName unitPrice")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: quotations }, { status: 200 });
  } catch (error) {
    console.error("GET /api/sales-quotation error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch sales quotations" }, { status: 500 });
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

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// export const config = { api: { bodyParser: false } };

// export async function POST(req) {
//   try {
//     await dbConnect();

//     const token = getTokenFromHeader(req);
//     if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

//     const decoded = verifyJWT(token);
//     if (!decoded) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

//     const companyId = decoded.companyId;
//     if (!mongoose.isValidObjectId(companyId)) {
//       return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 400 });
//     }

//     const formData = await req.formData();
//     const jsonData = JSON.parse(formData.get("quotationData"));
//     const files = formData.getAll("attachments");

//     if (!jsonData.customer || !mongoose.isValidObjectId(jsonData.customer)) {
//       return NextResponse.json({ success: false, error: "Valid customer ID required" }, { status: 422 });
//     }
//     if (!Array.isArray(jsonData.items) || jsonData.items.length === 0) {
//       return NextResponse.json({ success: false, error: "At least one item is required" }, { status: 422 });
//     }

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


//      const now = new Date();
//       const currentYear = now.getFullYear();
//       const currentMonth = now.getMonth() + 1;
  
//       let fyStart = currentYear;
//       let fyEnd = currentYear + 1;
//       if (currentMonth < 4) {
//         fyStart = currentYear - 1;
//         fyEnd = currentYear;
//       }
  
//       const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
//       const key = "Sales Quotation";
  
//       let counter = await Counter.findOne({ id: key, companyId }).session(session);
//       if (!counter) {
//         const [created] = await Counter.create([{ id: key, companyId, seq: 1 }], { session });
//         counter = created;
//       } else {
//         counter.seq += 1;
//         await counter.save({ session });
//       }
  
//       const paddedSeq = String(counter.seq).padStart(5, "0");
//       jsonData.documentNumberQuatation = `SALES-QUA/${financialYear}/${paddedSeq}`;

//     // ✅ Save in DB
//     const quotation = await SalesQuotation.create({
//       ...jsonData,
//       companyId,
//       attachments: finalAttachments,
//       createdBy: decoded.id,
//     });

//     const populatedQuotation = await SalesQuotation.findById(quotation._id)
//       .populate("customer", "customerCode customerName contactPerson")
//       .populate("items.item", "itemCode itemName unitPrice");

//     return NextResponse.json(
//       { success: true, data: populatedQuotation, message: "Sales Quotation created successfully" },
//       { status: 201 }
//     );
//   } catch (error) {
//     console.error("POST /api/sales-quotation error:", error);
//     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
//   }
// }

// export async function GET(req) {
//   try {
//     await dbConnect();

//     // ✅ Get token from request headers
//     const token = getTokenFromHeader(req);
//     if (!token) {
//       return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
//     }

//     // ✅ Verify JWT
//     const decoded = verifyJWT(token);
//     if (!decoded) {
//       return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
//     }

//     const companyId = decoded.companyId;
//     if (!companyId || !mongoose.isValidObjectId(companyId)) {
//       return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 400 });
//     }

//     // ✅ Fetch quotations for the company
//     const quotations = await SalesQuotation.find({ companyId })
//       .populate("customer", "customerCode customerName contactPerson")
//       .populate("items.item", "itemCode itemName unitPrice")
//       .sort({ createdAt: -1 }); // Latest first

//     return NextResponse.json({ success: true, data: quotations }, { status: 200 });
//   } catch (error) {
//     console.error("GET /api/sales-quotation error:", error);
//     return NextResponse.json(
//       { success: false, error: "Failed to fetch sales quotations" },
//       { status: 500 }
//     );
//   }
// }

