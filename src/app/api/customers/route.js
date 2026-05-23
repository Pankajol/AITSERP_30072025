import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import Customer from "@/models/CustomerModel";
import CompanyUser from "@/models/CompanyUser";
import SlaPolicy from "@/models/helpdesk/SlaPolicy";
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

async function uploadToCloudinary(fileBuffer, originalName) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "customers",
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
  let customerData = dataField ? JSON.parse(dataField) : {};
  return { files, customerData };
}

/**
 * Normalize assignedAgents array.
 * Accepts:
 *   - Array of strings (valid ObjectId)
 *   - Array of objects with _id or id property
 *   - Comma-separated string
 * Returns array of mongoose.Types.ObjectId
 * Throws error if any entry is invalid.
 */
function normalizeAssignedAgents(agents) {
  if (!agents) return [];

  let agentsArray = agents;
  if (typeof agentsArray === 'string') {
    agentsArray = agentsArray.split(',').filter(s => s.trim());
  }
  if (!Array.isArray(agentsArray)) {
    throw new Error("assignedAgents must be an array or comma-separated string");
  }

  const validIds = [];
  for (const item of agentsArray) {
    if (!item) continue;
    let idStr = null;
    if (typeof item === 'string') {
      idStr = item.trim();
    } else if (typeof item === 'object') {
      // Extract _id or id property
      idStr = item._id || item.id;
      if (idStr && typeof idStr === 'string') idStr = idStr.trim();
      else if (idStr && typeof idStr === 'object' && idStr.toString) idStr = idStr.toString();
    }
    if (!idStr) {
      throw new Error(`Invalid agent entry: missing id (${JSON.stringify(item)})`);
    }
    if (!mongoose.Types.ObjectId.isValid(idStr)) {
      throw new Error(`Invalid agent ObjectId: ${idStr}`);
    }
    validIds.push(new mongoose.Types.ObjectId(idStr));
  }
  return validIds;
}

// ------------------- GET /api/customers -------------------
export async function GET(req) {
  try {
    await dbConnect();
    const { user, error } = await validateUser(req);
    if (error || !isAuthorized(user)) {
      return NextResponse.json(
        { success: false, message: error || "Forbidden" },
        { status: error ? 401 : 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    
    // Get single customer by ID
    const id = searchParams.get("id");
    if (id) {
      const customer = await Customer.findOne({ _id: id, companyId: user.companyId })
        .populate("assignedAgents", "name email")
        .populate("glAccount", "accountName accountCode")
        .lean();
      if (!customer) {
        return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: customer });
    }

    const getStats = searchParams.get("getStats") === "true";
    if (getStats) {
      const stats = await Customer.aggregate([
        { $match: { companyId: user.companyId } },
        {
          $group: {
            _id: { $toLower: { $ifNull: ["$customerType", "unknown"] } },
            count: { $sum: 1 }
          }
        }
      ]);
      const result = { total: 0, Individual: 0, Business: 0, Government: 0 };
      stats.forEach(s => {
        if (s._id === "individual") result.Individual = s.count;
        else if (s._id === "business") result.Business = s.count;
        else if (s._id === "government") result.Government = s.count;
        result.total += s.count;
      });
      return NextResponse.json({ success: true, data: result });
    }

    // Paginated list
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";
    const customerType = searchParams.get("customerType");

    const query = { companyId: user.companyId };
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { customerCode: { $regex: search, $options: "i" } },
        { emailId: { $regex: search, $options: "i" } },
        { mobileNumber: { $regex: search, $options: "i" } },
      ];
    }
    if (customerType && customerType !== "All") {
      query.customerType = customerType;
    }

    const skip = (page - 1) * limit;
    const [customers, total] = await Promise.all([
      Customer.find(query)
        .populate("assignedAgents", "name email")
        .populate("glAccount", "accountName accountCode")
        .skip(skip)
        .limit(limit)
        .lean(),
      Customer.countDocuments(query)
    ]);

    return NextResponse.json({
      success: true,
      data: customers,
      meta: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ------------------- POST /api/customers -------------------
export async function POST(req) {
  await dbConnect();
  const { user, error } = await validateUser(req);
  if (error || !isAuthorized(user)) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
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
        const url = await uploadToCloudinary(buffer, file.name);
        uploadedUrls.push(url);
      }
    } else {
      customerData = await req.json();
    }

    // Remove _id if present (it's for updates only)
    delete customerData._id;

    // Validation
    if (
      !customerData.customerName?.trim() ||
      !customerData.customerGroup?.trim() ||
      !customerData.customerType?.trim() ||
      !customerData.pan?.trim()
    ) {
      return NextResponse.json(
        { success: false, message: "Required fields missing" },
        { status: 400 }
      );
    }

    // --- Normalize assignedAgents ---
    try {
      customerData.assignedAgents = normalizeAssignedAgents(customerData.assignedAgents);
    } catch (normErr) {
      return NextResponse.json(
        { success: false, message: normErr.message },
        { status: 400 }
      );
    }

    // ---------------- GL ACCOUNT ----------------
    let glAccountId = null;
    if (customerData.glAccount) {
      glAccountId = new mongoose.Types.ObjectId(
        customerData.glAccount._id || customerData.glAccount
      );
    } else {
      const customerName = customerData.customerName.trim();
      let account = await AccountHead.findOne({
        companyId: user.companyId,
        name: { $regex: new RegExp(`^${customerName}$`, "i") }
      });
      if (!account) {
        const accountCode = `CUS-${Date.now()}`;
        account = await AccountHead.create({
          companyId: user.companyId,
          name: customerName,
          code: accountCode,
          type: "Asset",
          group: "Accounts Receivable",
          balanceType: "Debit",
        });
      }
      glAccountId = account._id;
    }

    // Attachments
    const oldUrls = customerData.attachments
      ? customerData.attachments.split(",").filter(Boolean)
      : [];
    customerData.attachments = [...oldUrls, ...uploadedUrls].join(",");

    // Final data
    customerData.companyId = user.companyId;
    customerData.createdBy = user.id;
    customerData.glAccount = glAccountId;

    const newCustomer = await Customer.create(customerData);
    await newCustomer.populate([
      { path: "glAccount", select: "name code" },
      { path: "assignedAgents" }
    ]);

    return NextResponse.json(
      { success: true, data: newCustomer },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: err.message || "Creation failed" },
      { status: 500 }
    );
  }
}

// ------------------- PUT /api/customers -------------------
export async function PUT(req) {
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
        const url = await uploadToCloudinary(buffer, file.name);
        uploadedUrls.push(url);
      }
    } else {
      customerData = await req.json();
    }

    const { _id, ...updateData } = customerData;
    if (!_id) {
      return NextResponse.json({ success: false, message: "Customer ID required" }, { status: 400 });
    }

    // --- Normalize assignedAgents ---
    if (updateData.assignedAgents !== undefined) {
      try {
        updateData.assignedAgents = normalizeAssignedAgents(updateData.assignedAgents);
      } catch (normErr) {
        return NextResponse.json(
          { success: false, message: normErr.message },
          { status: 400 }
        );
      }
    }

    // Handle glAccount similarly
    if (updateData.glAccount) {
      if (typeof updateData.glAccount === "string") {
        updateData.glAccount = new mongoose.Types.ObjectId(updateData.glAccount);
      } else if (updateData.glAccount._id) {
        updateData.glAccount = new mongoose.Types.ObjectId(updateData.glAccount._id);
      } else if (updateData.glAccount.id) {
        updateData.glAccount = new mongoose.Types.ObjectId(updateData.glAccount.id);
      }
    } else {
      delete updateData.glAccount;
    }

    // Merge attachments
    let finalAttachments = updateData.attachments || "";
    if (uploadedUrls.length) {
      const existingArr = finalAttachments ? finalAttachments.split(",").filter(Boolean) : [];
      finalAttachments = [...existingArr, ...uploadedUrls].join(",");
    }
    updateData.attachments = finalAttachments;

    const updated = await Customer.findOneAndUpdate(
      { _id, companyId: user.companyId },
      { ...updateData, updatedBy: user.id },
      { new: true, runValidators: true }
    )
      .populate("glAccount", "accountName accountCode")
      .populate("assignedAgents", "name email")
      .populate("slaPolicyId", "name");

    if (!updated) {
      return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to update customer" }, { status: 500 });
  }
}

// ------------------- DELETE /api/customers -------------------
export async function DELETE(req) {
  await dbConnect();
  const { user, error } = await validateUser(req);
  if (error || !isAuthorized(user)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });
  }

  try {
    const deleted = await Customer.findOneAndDelete({ _id: id, companyId: user.companyId });
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
// import Customer from "@/models/CustomerModel";
// import CompanyUser from "@/models/CompanyUser";
// import SlaPolicy from "@/models/helpdesk/SlaPolicy";

// import AccountHead from "@/models/accounts/AccountHead";

// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { v2 as cloudinary } from "cloudinary";

// import mongoose from "mongoose";

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // ------------------- Helpers -------------------
// function isAuthorized(user) {
//   if (!user) return false;
//   if (user.type === "company") return true;
//   const allowedRoles = [
//     "admin", "crm", "sales manager", "purchase manager",
//     "inventory manager", "accounts manager", "hr manager",
//     "support executive", "production head", "project manager"
//   ];
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

// async function uploadToCloudinary(fileBuffer, originalName) {
//   return new Promise((resolve, reject) => {
//     const uploadStream = cloudinary.uploader.upload_stream(
//       {
//         folder: "customers",
//         resource_type: "auto",
//         public_id: `${Date.now()}_${originalName.replace(/\s/g, "_")}`,
//       },
//       (error, result) => (error ? reject(error) : resolve(result.secure_url))
//     );
//     uploadStream.end(fileBuffer);
//   });
// }

// async function parseMultipart(req) {
//   const formData = await req.formData();
//   const files = formData.getAll("attachments").filter(f => f && f.size > 0);
//   const dataField = formData.get("data");
//   let customerData = dataField ? JSON.parse(dataField) : {};
//   return { files, customerData };
// }

// // ------------------- GET /api/customers -------------------
// export async function GET(req) {
//   try {
//     await dbConnect();
//     const { user, error } = await validateUser(req);
//     if (error || !isAuthorized(user)) {
//       return NextResponse.json(
//         { success: false, message: error || "Forbidden" },
//         { status: error ? 401 : 403 }
//       );
//     }

//     const { searchParams } = new URL(req.url);
    
//     // ✅ Get single customer by ID (for editing)
//     const id = searchParams.get("id");
//     if (id) {
//       const customer = await Customer.findOne({ _id: id, companyId: user.companyId })
//         .populate("assignedAgents", "name email")
//         .populate("glAccount", "accountName accountCode")
//         .lean();
//       if (!customer) {
//         return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
//       }
//       return NextResponse.json({ success: true, data: customer });
//     }

//  const getStats = searchParams.get("getStats") === "true";

//     // Stats only (case‑insensitive)
//     if (getStats) {
//   const stats = await Customer.aggregate([
//     { $match: { companyId: user.companyId } }, // no isActive filter
//     {
//       $group: {
//         _id: { $toLower: { $ifNull: ["$customerType", "unknown"] } },
//         count: { $sum: 1 }
//       }
//     }
//   ]);

//   const result = { total: 0, Individual: 0, Business: 0, Government: 0 };
//   stats.forEach(s => {
//     if (s._id === "individual") result.Individual = s.count;
//     else if (s._id === "business") result.Business = s.count;
//     else if (s._id === "government") result.Government = s.count;
//     result.total += s.count;
//   });
//   return NextResponse.json({ success: true, data: result });
// }

//     // Paginated list (lightweight)
//     const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
//     const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
//     const search = searchParams.get("search") || "";
//     const customerType = searchParams.get("customerType");

//     const query = { companyId: user.companyId };
//     if (search) {
//       query.$or = [
//         { customerName: { $regex: search, $options: "i" } },
//         { customerCode: { $regex: search, $options: "i" } },
//         { emailId: { $regex: search, $options: "i" } },
//         { mobileNumber: { $regex: search, $options: "i" } },
//       ];
//     }
//     if (customerType && customerType !== "All") {
//       query.customerType = customerType;
//     }

//     const skip = (page - 1) * limit;
//     const [customers, total] = await Promise.all([
//       Customer.find(query)
//         .populate("assignedAgents", "name email")
//         .populate("glAccount", "accountName accountCode")

//         .skip(skip)
//         .limit(limit)
//         .lean(),
//       Customer.countDocuments(query)
//     ]);

//     return NextResponse.json({
//       success: true,
//       data: customers,
//       meta: { page, limit, total, pages: Math.ceil(total / limit) }
//     });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
//   }
// }

// // ------------------- POST /api/customers -------------------
// export async function POST(req) {

//   await dbConnect();

//   const { user, error } = await validateUser(req);

//   if (error || !isAuthorized(user)) {

//     return NextResponse.json(
//       {
//         success: false,
//         message: "Unauthorized"
//       },
//       { status: 401 }
//     );
//   }

//   try {

//     let customerData = {};
//     let uploadedUrls = [];

//     const contentType = req.headers.get("content-type") || "";

//     // Multipart
//     if (contentType.includes("multipart/form-data")) {

//       const { files, customerData: data } = await parseMultipart(req);

//       customerData = data;

//       for (const file of files) {

//         const buffer = Buffer.from(await file.arrayBuffer());

//         const url = await uploadToCloudinary(buffer, file.name);

//         uploadedUrls.push(url);
//       }

//     } else {

//       customerData = await req.json();
//     }

//     // Validation
//     if (
//       !customerData.customerName?.trim() ||
//       !customerData.customerGroup?.trim() ||
//       !customerData.customerType?.trim() ||
//       !customerData.pan?.trim()
//     ) {

//       return NextResponse.json(
//         {
//           success: false,
//           message: "Required fields missing"
//         },
//         { status: 400 }
//       );
//     }

//   // --- Safe conversion for assignedAgents ---
// let agentsArray = customerData.assignedAgents;
// if (typeof agentsArray === 'string') {
//   // handle comma-separated string from multipart form-data
//   agentsArray = agentsArray.split(',').filter(s => s.trim());
// }
// if (!Array.isArray(agentsArray)) agentsArray = [];

// const validAgentIds = [];
// for (const id of agentsArray) {
//   if (!id) continue;
//   const idStr = String(id).trim();
//   if (mongoose.Types.ObjectId.isValid(idStr)) {
//     validAgentIds.push(new mongoose.Types.ObjectId(idStr));
//   } else {
//     console.warn(`Invalid agent ObjectId skipped: ${idStr}`);
//     // optional: return 400 error here
//   }
// }
// customerData.assignedAgents = validAgentIds;

//     // ---------------- GL ACCOUNT ----------------

//     let glAccountId = null;

//     if (customerData.glAccount) {

//       glAccountId = new mongoose.Types.ObjectId(
//         customerData.glAccount._id || customerData.glAccount
//       );

//     } else {

//       const customerName = customerData.customerName.trim();

//       // Find existing account
//       let account = await AccountHead.findOne({
//         companyId: user.companyId,
//         name: {
//           $regex: new RegExp(`^${customerName}$`, "i")
//         }
//       });

//       // Create account if not exists
//       if (!account) {

//         const accountCode = `CUS-${Date.now()}`;

//         account = await AccountHead.create({
//           companyId: user.companyId,
//           name: customerName,
//           code: accountCode,
//           type: "Asset",
//           group: "Accounts Receivable",
//           balanceType: "Debit",
//         });
//       }

//       glAccountId = account._id;
//     }

//     // Attachments
//     const oldUrls = customerData.attachments
//       ? customerData.attachments.split(",").filter(Boolean)
//       : [];

//     customerData.attachments =
//       [...oldUrls, ...uploadedUrls].join(",");

//     // Final data
//     customerData.companyId = user.companyId;
//     customerData.createdBy = user.id;
//     customerData.glAccount = glAccountId;

//     // Create customer
//     const newCustomer = await Customer.create(customerData);

//     await newCustomer.populate([
//       {
//         path: "glAccount",
//         select: "name code"
//       },
//       {
//         path: "assignedAgents"
//       }
//     ]);

//     return NextResponse.json(
//       {
//         success: true,
//         data: newCustomer
//       },
//       { status: 201 }
//     );

//   } catch (err) {

//     console.error(err);

//     return NextResponse.json(
//       {
//         success: false,
//         message: err.message || "Creation failed"
//       },
//       { status: 500 }
//     );
//   }
// }

// // ------------------- PUT /api/customers (update) -------------------
// export async function PUT(req) {
//   await dbConnect();
//   const { user, error } = await validateUser(req);
//   if (error || !isAuthorized(user)) {
//     return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
//   }

//   try {
//     let customerData = {};
//     let uploadedUrls = [];
//     const contentType = req.headers.get("content-type") || "";

//     if (contentType.includes("multipart/form-data")) {
//       const { files, customerData: data } = await parseMultipart(req);
//       customerData = data;
//       for (const file of files) {
//         const buffer = Buffer.from(await file.arrayBuffer());
//         const url = await uploadToCloudinary(buffer, file.name);
//         uploadedUrls.push(url);
//       }
//     } else {
//       customerData = await req.json();
//     }

//     const { _id, ...updateData } = customerData;
//     // --- Safe conversion for assignedAgents in PUT ---
// let agentsArray = updateData.assignedAgents;
// if (typeof agentsArray === 'string') {
//   agentsArray = agentsArray.split(',').filter(s => s.trim());
// }
// if (!Array.isArray(agentsArray)) {
//   delete updateData.assignedAgents; // remove if not an array
// } else {
//   const validAgentIds = [];
//   for (const id of agentsArray) {
//     if (!id) continue;
//     const idStr = String(id).trim();
//     if (mongoose.Types.ObjectId.isValid(idStr)) {
//       validAgentIds.push(new mongoose.Types.ObjectId(idStr));
//     } else {
//       console.warn(`Invalid agent ObjectId skipped on update: ${idStr}`);
//     }
//   }
//   updateData.assignedAgents = validAgentIds;
// }
//     if (!_id) {
//       return NextResponse.json({ success: false, message: "Customer ID required" }, { status: 400 });
//     }

//     // ✅ Handle glAccount similarly
//     if (updateData.glAccount) {
//       if (typeof updateData.glAccount === "string") {
//         updateData.glAccount = new mongoose.Types.ObjectId(updateData.glAccount);
//       } else if (updateData.glAccount._id) {
//         updateData.glAccount = new mongoose.Types.ObjectId(updateData.glAccount._id);
//       } else if (updateData.glAccount.id) {
//         updateData.glAccount = new mongoose.Types.ObjectId(updateData.glAccount.id);
//       }
//     } else {
//       delete updateData.glAccount; // prevent overwriting with null
//     }

//     // Merge attachments: existing (from updateData.attachments) + newly uploaded
//     let finalAttachments = updateData.attachments || "";
//     if (uploadedUrls.length) {
//       const existingArr = finalAttachments ? finalAttachments.split(",").filter(Boolean) : [];
//       finalAttachments = [...existingArr, ...uploadedUrls].join(",");
//     }
//     updateData.attachments = finalAttachments;

//     const updated = await Customer.findOneAndUpdate(
//       { _id, companyId: user.companyId },
//       { ...updateData, updatedBy: user.id },
//       { new: true, runValidators: true }
//     )
//       .populate("glAccount", "accountName accountCode")
//       .populate("assignedAgents", "name email")
//       .populate("slaPolicyId", "name");

//     if (!updated) {
//       return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });
//     }

//     return NextResponse.json({ success: true, data: updated });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Failed to update customer" }, { status: 500 });
//   }
// }

// // ------------------- DELETE /api/customers -------------------
// export async function DELETE(req) {
//   await dbConnect();
//   const { user, error } = await validateUser(req);
//   if (error || !isAuthorized(user)) {
//     return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
//   }

//   const { searchParams } = new URL(req.url);
//   const id = searchParams.get("id");
//   if (!id) {
//     return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });
//   }

//   try {
//     const deleted = await Customer.findOneAndDelete({ _id: id, companyId: user.companyId });
//     if (!deleted) {
//       return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
//     }
//     return NextResponse.json({ success: true, message: "Deleted" });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
//   }
// }