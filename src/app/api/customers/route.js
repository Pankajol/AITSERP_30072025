import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import Customer from "@/models/CustomerModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";
import AccountHead from "@/models/accounts/AccountHead";

// ------------------- Cloudinary configuration -------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ------------------- Helper functions -------------------
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = [
    "admin", "crm", "sales manager", "purchase manager",
    "inventory manager", "accounts manager", "hr manager",
    "support executive", "production head", "project manager"
  ];
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some(role => allowedRoles.includes(role.trim().toLowerCase()));
}

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "No token", status: 401 };
  const decoded = verifyJWT(token);
  if (!decoded) return { error: "Invalid token", status: 401 };
  return { user: decoded, error: null };
}

// Upload a single file to Cloudinary, return the secure URL
async function uploadToCloudinary(fileBuffer, originalName, mimeType) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "customers",
        resource_type: "auto",
        public_id: `${Date.now()}_${originalName.replace(/\s/g, "_")}`,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
}

// Parse multipart form data (files + JSON data field)
async function parseMultipart(req) {
  const formData = await req.formData();
  const files = formData.getAll("attachments").filter(f => f && f.size > 0);
  const dataField = formData.get("data");
  let customerData = dataField ? JSON.parse(dataField) : {};
  return { files, customerData };
}

// ------------------- GET: List all customers -------------------
export async function GET(req) {
  await dbConnect();
  const { user, error } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status: 401 });
  if (!isAuthorized(user))
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  let query = { companyId: user.companyId };
  let limit = 20; // default limit for listing (when no search)

  if (search.trim()) {
    // If search term provided, use $or for partial matching
    query.$or = [
      { customerName: { $regex: search, $options: "i" } },
      { customerCode: { $regex: search, $options: "i" } },
      { emailId: { $regex: search, $options: "i" } },
      { mobileNumber: { $regex: search, $options: "i" } },
      { contactPersonName: { $regex: search, $options: "i" } },
      { pan: { $regex: search, $options: "i" } },
      { gstNumber: { $regex: search, $options: "i" } },
    ];
    limit = 50; // allow more results when actively searching
  }

  try {
    const customers = await Customer.find(query)
      .select("customerName customerCode emailId mobileNumber contactPersonName gstNumber pan _id")
      .limit(limit)
      .sort({ customerName: 1 });

    return NextResponse.json({ success: true, data: customers }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to fetch customers" }, { status: 500 });
  }
}

// ------------------- POST: Create new customer (with optional files) -------------------
export async function POST(req) {
  await dbConnect();
  const { user, error } = await validateUser(req);
  if (error || !isAuthorized(user)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    let customerData = {};
    let uploadedUrls = [];
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const { files, customerData: data } = await parseMultipart(req);
      customerData = data;
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await uploadToCloudinary(buffer, file.name, file.type);
        uploadedUrls.push(url);
      }
    } else {
      customerData = await req.json();
    }

    // --- Prevent duplicate customer code ---
    const existingCustomer = await Customer.findOne({
      customerCode: customerData.customerCode,
      companyId: user.companyId,
    });
    if (existingCustomer) {
      return NextResponse.json(
        { success: false, message: "Customer Code already exists" },
        { status: 400 }
      );
    }

    // --- Auto-create AccountHead for customer ---
  
    let existingAccount = await AccountHead.findOne({
      companyId: user.companyId,
      name: customerData.customerName,
    });

    let account;
    if (existingAccount) {
      account = existingAccount;
    } else {
      // Optional: generate a unique account code (e.g., using a counter)
      const lastAccount = await AccountHead.findOne({ companyId: user.companyId })
        .sort({ accountCode: -1 });
      let nextCode = "CUST-1000";
      if (lastAccount && lastAccount.accountCode) {
        const num = parseInt(lastAccount.accountCode.split("-")[1], 10) + 1;
        nextCode = `CUST-${num}`;
      }
      account = await AccountHead.create({
        companyId: user.companyId,
        name: customerData.customerName,
        accountCode: nextCode,
        type: "Asset",
        group: "Current Asset",
        balanceType: "Debit",
      });
    }

    // --- Handle attachments (merge existing + new) ---
    let existingAttachments = [];
    if (customerData._id) {
      // For update: fetch current attachments if not provided
      if (!customerData.attachments) {
        const existing = await Customer.findById(customerData._id).select("attachments");
        if (existing?.attachments) {
          existingAttachments = existing.attachments.split(",").filter(Boolean);
        }
      } else if (typeof customerData.attachments === "string") {
        existingAttachments = customerData.attachments.split(",").filter(Boolean);
      }
    } else if (customerData.attachments && typeof customerData.attachments === "string") {
      existingAttachments = customerData.attachments.split(",").filter(Boolean);
    }

    const allUrls = [...existingAttachments, ...uploadedUrls];
    customerData.attachments = allUrls.join(",");

    // --- Attach the account ID and create customer ---
    customerData.glAccount = account._id;

    const customer = new Customer({
      ...customerData,
      companyId: user.companyId,
      createdBy: user.id,
    });
    await customer.save();

    const populated = await Customer.findById(customer._id)
      .populate("glAccount")
      .populate("assignedAgents", "name email")
      .populate("slaPolicyId", "name description");

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Failed to create customer" },
      { status: 500 }
    );
  }
}



// import { NextResponse } from "next/server";
// import mongoose from "mongoose";          // ✅ ADD THIS IMPORT
// import dbConnect from "@/lib/db.js";
// import Customer from "@/models/CustomerModel";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import BankHead from "@/models/BankHead"; // ✅ If you actually need this later, keep it; otherwise remove to avoid unused import


// import { v2 as cloudinary } from "cloudinary";

// // Cloudinary config
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });


// function isAuthorized(user) {
//   if (!user) return false;
//   if (user.type === "company") return true;
//   const allowedRoles = ["admin","crm","sales manager","purchase manager","inventory manager","accounts manager","hr manager","support executive","production head","project manager"];
//   const userRoles = Array.isArray(user.roles) ? user.roles : [];
//   return userRoles.some(role => allowedRoles.includes(role.trim().toLowerCase()));
// }

// async function validateUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "No token", status: 401 };
//   const decoded = verifyJWT(token);
//   if (!decoded) return { error: "Invalid token", status: 401 };
//   return { user: decoded, error: null };
// }

// // Helper: Convert the malformed string (e.g. "[{ name: 'file.png', ... }]") into a proper array of objects
// function normalizeAttachments(input) {
//   if (!input) return [];
  
//   // If it's already an array, ensure each item is an object with required fields
//   if (Array.isArray(input)) {
//     return input.map(item => {
//       if (typeof item === "string") {
//         return { name: "file", url: item, size: 0, type: "application/octet-stream", uploadedAt: new Date() };
//       }
//       return {
//         name: item.name || "file",
//         size: item.size || 0,
//         type: item.type || "application/octet-stream",
//         url: item.url,
//         uploadedAt: item.uploadedAt || new Date()
//       };
//     });
//   }
  
//   // If it's a string, try to parse it
//   if (typeof input === "string") {
//     // First try JSON.parse
//     try {
//       const parsed = JSON.parse(input);
//       if (Array.isArray(parsed)) return normalizeAttachments(parsed);
//       return normalizeAttachments([parsed]);
//     } catch {
//       // Not valid JSON – it's the malformed JS literal
//       // Extract URLs using regex (safe fallback)
//       const urls = input.match(/https?:\/\/[^\s'",]+/g) || [];
//       return urls.map(url => ({
//         name: "file",
//         size: 0,
//         type: "application/octet-stream",
//         url: url,
//         uploadedAt: new Date()
//       }));
//     }
//   }
  
//   return [];
// }

// export async function GET(req) {
//   await dbConnect();
//   const { user, error } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status: 401 });
//   if (!isAuthorized(user)) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

//   try {
//     const customers = await Customer.find({ companyId: user.companyId })
//       .populate("assignedAgents", "name email")
//       .populate("glAccount", "accountName accountCode");
//     return NextResponse.json({ success: true, data: customers }, { status: 200 });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Failed to fetch customers" }, { status: 500 });
//   }
// }

// export async function POST(req) {
//   await dbConnect();
//   const { user, error } = await validateUser(req);
//   if (error || !isAuthorized(user)) {
//     return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
//   }

//   try {
//     // Parse multipart form data
//     const formData = await req.formData();
//     const files = formData.getAll("attachments"); // array of File objects
//     const dataField = formData.get("data");       // JSON string of other fields

//     let customerData = dataField ? JSON.parse(dataField) : {};

//     // Upload files to Cloudinary
//     const uploadedAttachments = [];
//     for (const file of files) {
//       if (!file.size) continue;
//       const arrayBuffer = await file.arrayBuffer();
//       const buffer = Buffer.from(arrayBuffer);
      
//       const result = await new Promise((resolve, reject) => {
//         const uploadStream = cloudinary.uploader.upload_stream(
//           {
//             folder: "customers",
//             resource_type: "auto",
//             public_id: `${Date.now()}_${file.name.replace(/\s/g, "_")}`,
//           },
//           (error, result) => {
//             if (error) reject(error);
//             else resolve(result);
//           }
//         );
//         uploadStream.end(buffer);
//       });

//       uploadedAttachments.push({
//         name: file.name,
//         size: file.size,
//         type: file.type,
//         url: result.secure_url,
//         public_id: result.public_id,
//         uploadedAt: new Date(),
//       });
//     }

//     // Merge with existing attachments if any (for edit case)
//     let existingAttachments = customerData.attachments || [];
//     if (typeof existingAttachments === "string") {
//       try { existingAttachments = JSON.parse(existingAttachments); } catch { existingAttachments = []; }
//     }
//     const allAttachments = [...existingAttachments, ...uploadedAttachments];

//     // Prepare final payload
//     const payload = {
//       ...customerData,
//       attachments: allAttachments,
//       companyId: user.companyId,
//       createdBy: user.id,
//     };

//     let customer;
//     if (customerData._id) {
//       // Update existing
//       customer = await Customer.findByIdAndUpdate(customerData._id, payload, { new: true });
//     } else {
//       // Create new
//       customer = new Customer(payload);
//       await customer.save();
//     }

//     const populated = await Customer.findById(customer._id).populate("glAccount");
//     return NextResponse.json({ success: true, data: populated }, { status: 200 });
//   } catch (error) {
//     console.error(error);
//     return NextResponse.json({ success: false, message: "Failed to save customer" }, { status: 500 });
//   }
// }



// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db.js";
// import Customer from "@/models/CustomerModel";
// import CompanyUser from "@/models/CompanyUser";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// // If you actually need these later you can keep them; otherwise remove to avoid unused imports
// import BankHead from "@/models/BankHead";
// import Country from "@/app/api/countries/schema.js";
// import State from "../states/schema.js";

// export const runtime = "nodejs";

// /* -------------------------------
//    🔐 Role-Based Access Check
// -------------------------------- */
// function isAuthorized(user) {
//   if (!user) return false;

//   if (user.type === "company") return true;

//   const allowedRoles = [
//     "admin",
//     "crm",
//     "sales manager",
//     "purchase manager",
//     "inventory manager",
//     "accounts manager",
//     "hr manager",
//     "support executive",
//     "production head",
//     "project manager",
//   ];

//   const userRoles = Array.isArray(user.roles)
//     ? user.roles
//     : [];

//   return userRoles.some(role =>
//     allowedRoles.includes(role.trim().toLowerCase())
//   );
// }

// /* ✅ Validate User Helper */
// async function validateUser(req) {
//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) return { error: "No token provided", status: 401 };

//     const decoded = verifyJWT(token);
//     if (!decoded) return { error: "Invalid token", status: 401 };

//     return { user: decoded, error: null, status: 200 };
//   } catch (err) {
//     console.log("validateUser error:", err);
//     return { error: "Authentication failed", status: 401 };
//   }
// }

// export async function GET(req) {
//   await dbConnect();

//   const { user, error, status } = await validateUser(req);
//   if (error)
//     return NextResponse.json({ success: false, message: error }, { status });

//   // Authorization: ensure user has access to customers
//   if (!isAuthorized(user)) {
//     return NextResponse.json(
//       { success: false, message: "Forbidden: insufficient permissions" },
//       { status: 403 }
//     );
//   }

//   try {
//     // Restrict populated fields to avoid extra data
//     const customers = await Customer.find({
//       companyId: user.companyId,
//     })
//     .populate("assignedAgents", "name email")
//     .populate("glAccount", "accountName accountCode");

//     return NextResponse.json({ success: true, data: customers }, { status: 200 });
//   } catch (err) {
//     console.error("GET /customers error:", err);
//     return NextResponse.json(
//       { success: false, message: "Failed to fetch customers" },
//       { status: 500 }
//     );
//   }
// }


// /* ========================================
//    ✏️ POST /api/customers
//    Access: Admin, Sales Manager, Company
// ======================================== */
// export async function POST(req) {
//   await dbConnect();

//   try {
//     const token = getTokenFromHeader(req);
//     const user = await verifyJWT(token);

//     if (!user || !isAuthorized(user)) {
//       return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
//     }

//     const contentType = req.headers.get("content-type") || "";
//     if (!contentType.includes("application/json")) {
//       return NextResponse.json({ success: false, message: "Invalid content type" }, { status: 400 });
//     }

//     const body = await req.json();

//     const customer = new Customer({
//       ...body,
//       companyId: user.companyId,
//       createdBy: user.id,
//     });

//     await customer.save();

//     const populated = await Customer.findById(customer._id).populate("glAccount");

//     return NextResponse.json({ success: true, data: populated }, { status: 201 });

//   } catch (error) {
//     console.error("POST /customers error:", error);
//     return NextResponse.json({ success: false, message: "Failed to create customer" }, { status: 500 });
//   }
// }


