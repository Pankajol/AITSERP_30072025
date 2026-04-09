import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import Supplier from "@/models/SupplierModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

// Cloudinary config (same as above)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

// Auth helpers (same as in route.js)
function isAuthorized(user) {
  return user?.type === "company" || user?.role === "Admin" || user?.permissions?.includes("supplier");
}

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
    return { user };
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    return { error: "Invalid token", status: 401 };
  }
}

// ------------------- GET single supplier -------------------
export async function GET(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const supplier = await Supplier.findOne({ _id: params.id, companyId: user.companyId })
      .populate("glAccount", "accountName accountCode");
    if (!supplier) {
      return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: supplier }, { status: 200 });
  } catch (err) {
    console.error("GET single supplier error:", err);
    return NextResponse.json({ success: false, message: "Failed to fetch supplier" }, { status: 500 });
  }
}

// ------------------- PUT update supplier (with files) -------------------
export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    let updateData = {};
    let uploadedUrls = [];
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const { files, supplierData: data } = await parseMultipart(req);
      updateData = data;
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await uploadToCloudinary(buffer, file.name);
        uploadedUrls.push(url);
      }
    } else {
      updateData = await req.json();
    }

    // Fetch existing supplier to get current attachments
    const existingSupplier = await Supplier.findOne({ _id: params.id, companyId: user.companyId });
    if (!existingSupplier) {
      return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    }

    let existingAttachments = existingSupplier.attachments || "";
    if (typeof existingAttachments === "string") {
      existingAttachments = existingAttachments ? existingAttachments.split(",").filter(Boolean) : [];
    } else {
      existingAttachments = [];
    }

    // Merge old attachments with newly uploaded URLs
    const allUrls = [...existingAttachments, ...uploadedUrls];
    updateData.attachments = allUrls.join(",");

    const updated = await Supplier.findOneAndUpdate(
      { _id: params.id, companyId: user.companyId },
      updateData,
      { new: true, runValidators: true }
    ).populate("glAccount", "accountName accountCode");

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (err) {
    console.error("PUT supplier error:", err);
    return NextResponse.json({ success: false, message: "Failed to update supplier" }, { status: 500 });
  }
}

// ------------------- DELETE supplier -------------------
export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const deleted = await Supplier.findOneAndDelete({ _id: params.id, companyId: user.companyId });
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Supplier deleted" }, { status: 200 });
  } catch (err) {
    console.error("DELETE supplier error:", err);
    return NextResponse.json({ success: false, message: "Failed to delete supplier" }, { status: 500 });
  }
}


// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db.js";
// import Supplier from "@/models/SupplierModels";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// function isAuthorized(user) {
//   return user?.type === "company" || user?.role === "Admin" || user?.permissions?.includes("supplier");
// }

// async function validateUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Token missing", status: 401 };

//   try {
//     const user = await verifyJWT(token);
//     if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
//     return { user };
//   } catch (err) {
//     console.error("JWT verification failed:", err.message);
//     return { error: "Invalid token", status: 401 };
//   }
// }

// /* ---------------------------
//    GET: Single Supplier
// --------------------------- */
// export async function GET(req, { params }) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const supplier = await Supplier.findOne({ _id: params.id, companyId: user.companyId })
//       .populate("glAccount", "accountName accountCode");

//     if (!supplier) {
//       return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
//     }

//     return NextResponse.json({ success: true, data: supplier }, { status: 200 });
//   } catch (err) {
//     console.error("GET single supplier error:", err);
//     return NextResponse.json({ success: false, message: "Failed to fetch supplier" }, { status: 500 });
//   }
// }

// /* ---------------------------
//    PUT: Update Supplier
// --------------------------- */
// export async function PUT(req, { params }) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const data = await req.json();

//     const updated = await Supplier.findOneAndUpdate(
//       { _id: params.id, companyId: user.companyId },
//       data,
//       { new: true, runValidators: true }
//     ).populate("glAccount", "accountName accountCode");

//     if (!updated) {
//       return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
//     }

//     return NextResponse.json({ success: true, data: updated }, { status: 200 });
//   } catch (err) {
//     console.error("PUT supplier error:", err);
//     return NextResponse.json({ success: false, message: "Failed to update supplier" }, { status: 500 });
//   }
// }

// /* ---------------------------
//    DELETE: Remove Supplier
// --------------------------- */
// export async function DELETE(req, { params }) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const deleted = await Supplier.findOneAndDelete({ _id: params.id, companyId: user.companyId });

//     if (!deleted) {
//       return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
//     }

//     return NextResponse.json({ success: true, message: "Supplier deleted" }, { status: 200 });
//   } catch (err) {
//     console.error("DELETE supplier error:", err);
//     return NextResponse.json({ success: false, message: "Failed to delete supplier" }, { status: 500 });
//   }
// }
