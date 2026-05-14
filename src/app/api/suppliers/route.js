import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import Supplier from "@/models/SupplierModels";
import AccountHead from "@/models/accounts/AccountHead";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ------------------- Helpers -------------------
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const roles = Array.isArray(user.roles) ? user.roles : [];
  if (roles.includes("Admin") || roles.includes("admin")) return true;
  if (roles.includes("masters")) return true;
  if (roles.includes("Purchase Manager")) return true;
  const modules = user.modules || {};
  if (modules["Suppliers"]?.selected) return true;
  return false;
}

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "No token", status: 401 };
  const decoded = verifyJWT(token);
  if (!decoded) return { error: "Invalid token", status: 401 };
  if (!isAuthorized(decoded)) return { error: "Forbidden", status: 403 };
  return { user: decoded, error: null };
}

async function uploadToCloudinary(fileBuffer, originalName) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "suppliers",
        resource_type: "auto",
        public_id: `${Date.now()}_${originalName.replace(/\s/g, "_")}`,
      },
      (error, result) => (error ? reject(error) : resolve(result.secure_url))
    );
    uploadStream.end(fileBuffer);
  });
}

async function parseMultipart(req) {
  const formData = await req.formData();
  const files = formData.getAll("attachments").filter(f => f && f.size > 0);
  const dataField = formData.get("data");
  let supplierData = dataField ? JSON.parse(dataField) : {};
  return { files, supplierData };
}

// ------------------- GET /api/suppliers -------------------
export async function GET(req) {
  await dbConnect();
  const { user, error } = await validateUser(req);
  if (error) {
    return NextResponse.json({ success: false, message: error }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // Get single supplier (for editing)
    if (id) {
      const supplier = await Supplier.findOne({ _id: id, companyId: user.companyId })
        .populate("glAccount", "accountName accountCode")
        .lean();
      if (!supplier) {
        return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: supplier });
    }

    // Paginated list
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";
    const supplierType = searchParams.get("supplierType");

    const query = { companyId: user.companyId };
    if (search) {
      query.$or = [
        { supplierName: { $regex: search, $options: "i" } },
        { supplierCode: { $regex: search, $options: "i" } },
        { emailId: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
      ];
    }
    if (supplierType && supplierType !== "All") {
      query.supplierType = supplierType;
    }

    const skip = (page - 1) * limit;
    const [suppliers, total] = await Promise.all([
      Supplier.find(query)
        .select("supplierName supplierCode emailId mobileNumber supplierType supplierGroup valid glAccount")
        .populate("glAccount", "accountName accountCode")
        .skip(skip)
        .limit(limit)
        .lean(),
      Supplier.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: suppliers,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ------------------- POST /api/suppliers -------------------
export async function POST(req) {
  await dbConnect();
  const { user, error } = await validateUser(req);
  if (error) {
    return NextResponse.json({ success: false, message: error }, { status: 401 });
  }

  try {
    let supplierData = {};
    let uploadedUrls = [];
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const { files, supplierData: data } = await parseMultipart(req);
      supplierData = data;
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await uploadToCloudinary(buffer, file.name);
        uploadedUrls.push(url);
      }
    } else {
      supplierData = await req.json();
    }

    // Required fields
    if (!supplierData.supplierCode || !supplierData.supplierName || !supplierData.pan) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    // Check duplicate code
    const existing = await Supplier.findOne({
      supplierCode: supplierData.supplierCode,
      companyId: user.companyId,
    });
    if (existing) {
      return NextResponse.json({ success: false, message: "Supplier Code already exists" }, { status: 400 });
    }

    // Auto create GL account (Liability)
    let glAccountId = supplierData.glAccount;
    if (!glAccountId) {
      let account = await AccountHead.findOne({
        companyId: user.companyId,
        name: supplierData.supplierName,
        type: "Liability",
      });
      if (!account) {
        account = await AccountHead.create({
          companyId: user.companyId,
          name: supplierData.supplierName,
          type: "Liability",
          group: "Current Liability",
          balanceType: "Credit",
        });
      }
      glAccountId = account._id;
    } else {
      glAccountId = new mongoose.Types.ObjectId(glAccountId);
    }

    // Merge attachments
    let existingAttachments = supplierData.attachments || "";
    const oldUrls = existingAttachments ? existingAttachments.split(",").filter(Boolean) : [];
    const allAttachments = [...oldUrls, ...uploadedUrls].join(",");

    const supplier = new Supplier({
      ...supplierData,
      companyId: user.companyId,
      createdBy: user.id,
      glAccount: glAccountId,
      attachments: allAttachments,
    });
    await supplier.save();

    const populated = await Supplier.findById(supplier._id).populate("glAccount", "accountName accountCode");
    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to create supplier" }, { status: 500 });
  }
}

// ------------------- PUT /api/suppliers/[id] -------------------
export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error } = await validateUser(req);
  if (error) {
    return NextResponse.json({ success: false, message: error }, { status: 401 });
  }

  try {
    const id = params?.id || new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });
    }

    let supplierData = {};
    let uploadedUrls = [];
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const { files, supplierData: data } = await parseMultipart(req);
      supplierData = data;
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await uploadToCloudinary(buffer, file.name);
        uploadedUrls.push(url);
      }
    } else {
      supplierData = await req.json();
    }

    // Merge attachments: existing (from supplierData.attachments) + newly uploaded
    let finalAttachments = supplierData.attachments || "";
    if (uploadedUrls.length) {
      const existingArr = finalAttachments ? finalAttachments.split(",").filter(Boolean) : [];
      finalAttachments = [...existingArr, ...uploadedUrls].join(",");
    }
    supplierData.attachments = finalAttachments;

    // Handle glAccount if provided as object
    if (supplierData.glAccount && typeof supplierData.glAccount === "object") {
      supplierData.glAccount = supplierData.glAccount._id || null;
    }

    const updated = await Supplier.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { ...supplierData, updatedBy: user.id },
      { new: true, runValidators: true }
    ).populate("glAccount", "accountName accountCode");

    if (!updated) {
      return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Update failed" }, { status: 500 });
  }
}

// ------------------- DELETE /api/suppliers/[id] -------------------
export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error } = await validateUser(req);
  if (error) {
    return NextResponse.json({ success: false, message: error }, { status: 401 });
  }

  const id = params?.id || new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });
  }

  try {
    const deleted = await Supplier.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}




// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db.js";
// import Supplier from "@/models/SupplierModels";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import AccountHead from "@/models/accounts/AccountHead";
// import { v2 as cloudinary } from "cloudinary";

// // ------------------- Cloudinary config -------------------
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // Helper: upload a single file to Cloudinary
// async function uploadToCloudinary(fileBuffer, originalName) {
//   return new Promise((resolve, reject) => {
//     const uploadStream = cloudinary.uploader.upload_stream(
//       {
//         folder: "suppliers",
//         resource_type: "auto",
//         public_id: `${Date.now()}_${originalName.replace(/\s/g, "_")}`,
//       },
//       (error, result) => (error ? reject(error) : resolve(result.secure_url))
//     );
//     uploadStream.end(fileBuffer);
//   });
// }

// // Parse multipart form data (files + JSON data field)
// async function parseMultipart(req) {
//   const formData = await req.formData();
//   const files = formData.getAll("attachments").filter(f => f && f.size > 0);
//   const dataField = formData.get("data");
//   let supplierData = dataField ? JSON.parse(dataField) : {};
//   return { files, supplierData };
// }

// // ── Auth helpers (matches your existing JWT structure) ──
// function getToken(req) {
//   let header = null;
//   if (typeof req.headers.get === "function") {
//     header = req.headers.get("authorization") || req.headers.get("Authorization");
//   } else {
//     header = req.headers["authorization"] || req.headers["Authorization"];
//   }
//   if (!header) return null;
//   return header.startsWith("Bearer ") ? header.slice(7) : header;
// }

// function isAuthorized(decoded) {
//   if (!decoded) return false;
//   if (decoded.type === "company") return true;
//   const roles = Array.isArray(decoded.roles) ? decoded.roles : [];
//   if (roles.includes("Admin") || roles.includes("admin")) return true;
//   if (roles.includes("masters")) return true;
//   if (roles.includes("Purchase Manager")) return true;
//   const modules = decoded.modules || {};
//   if (modules["Suppliers"]?.selected) return true;
//   return false;
// }

// async function validateUser(req) {
//   const token = getToken(req);
//   if (!token) return { error: "Token missing", status: 401 };
//   try {
//     const decoded = verifyJWT(token);
//     if (!decoded) return { error: "Invalid token", status: 401 };
//     if (!isAuthorized(decoded)) return { error: "Forbidden", status: 403 };
//     return { user: decoded };
//   } catch (err) {
//     console.error("JWT error:", err.message);
//     return { error: err.message || "Invalid token", status: 401 };
//   }
// }

// // ------------------- GET /api/suppliers -------------------
// export async function GET(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const suppliers = await Supplier.find({ companyId: user.companyId })
//       .populate("glAccount", "name code") // ✅ Populate GL account details
//       .sort({ createdAt: -1 });
//     return NextResponse.json({ success: true, data: suppliers }, { status: 200 });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Failed to fetch suppliers" }, { status: 500 });
//   }
// }

// // ------------------- POST /api/suppliers -------------------
// export async function POST(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     let supplierData = {};
//     let uploadedUrls = [];
//     const contentType = req.headers.get("content-type") || "";

//     // Handle multipart file uploads
//     if (contentType.includes("multipart/form-data")) {
//       const { files, supplierData: data } = await parseMultipart(req);
//       supplierData = data;
//       for (const file of files) {
//         const buffer = Buffer.from(await file.arrayBuffer());
//         const url = await uploadToCloudinary(buffer, file.name);
//         uploadedUrls.push(url);
//       }
//     } else {
//       supplierData = await req.json();
//     }

//     // Validate required fields
//     const required = ["supplierCode", "supplierName", "supplierType", "pan"];
//     for (const field of required) {
//       if (!supplierData[field]) {
//         return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
//       }
//     }


//     // 🔥 Auto create AccountHead for supplier
// const existingAccount = await AccountHead.findOne({
//   companyId: user.companyId,
//   name: supplierData.supplierName,
// });

// let account;

// if (existingAccount) {
//   account = existingAccount;
// } else {
//   account = await AccountHead.create({
//     companyId: user.companyId,
//     name: supplierData.supplierName,
//     type: "Liability",
//     group: "Current Liability",
//     balanceType: "Credit",
//   });
// }
//     // Prevent duplicate supplierCode within same company
//     const existing = await Supplier.findOne({ supplierCode: supplierData.supplierCode, companyId: user.companyId });
//     if (existing) {
//       return NextResponse.json({ success: false, message: "Supplier Code already exists" }, { status: 400 });
//     }

//     // Merge existing attachments (if any) with newly uploaded URLs
//     let existingAttachments = supplierData.attachments || "";
//     if (typeof existingAttachments === "string") {
//       existingAttachments = existingAttachments ? existingAttachments.split(",").filter(Boolean) : [];
//     } else {
//       existingAttachments = [];
//     }
//     const allUrls = [...existingAttachments, ...uploadedUrls];
//     supplierData.attachments = allUrls.join(",");

//     const supplier = new Supplier({
//       ...supplierData,
//       companyId: user.companyId,
//       createdBy: user.id,
//       glAccount: account._id, 
//     });
//     await supplier.save();

//     const populated = await Supplier.findById(supplier._id).populate("glAccount", "accountName accountCode");
//     return NextResponse.json({ success: true, data: populated }, { status: 201 });
//   } catch (err) {
//     console.error("POST /suppliers error:", err);
//     if (err.code === 11000) {
//       const field = Object.keys(err.keyValue)[0];
//       return NextResponse.json({ success: false, message: `${field} already exists` }, { status: 400 });
//     }
//     return NextResponse.json({ success: false, message: "Failed to create supplier" }, { status: 500 });
//   }
// }