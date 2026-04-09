import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import Customer from "@/models/CustomerModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

// ------------------- Cloudinary configuration -------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ------------------- Helper functions (same as above) -------------------
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

async function parseMultipart(req) {
  const formData = await req.formData();
  const files = formData.getAll("attachments").filter(f => f && f.size > 0);
  const dataField = formData.get("data");
  let customerData = dataField ? JSON.parse(dataField) : {};
  return { files, customerData };
}

// ------------------- GET: Fetch a single customer -------------------
export async function GET(req, { params }) {
  await dbConnect();
  const { user, error } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status: 401 });
  if (!isAuthorized(user))
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  const { id } = params;
  if (!id) {
    return NextResponse.json({ success: false, message: "Customer ID required" }, { status: 400 });
  }

  try {
    const customer = await Customer.findById(id)
      .populate("assignedAgents", "name email")
      .populate("glAccount", "accountName accountCode");
    if (!customer) {
      return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: customer }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to fetch customer" }, { status: 500 });
  }
}

// ------------------- PUT: Update an existing customer (with optional files) -------------------
export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error } = await validateUser(req);
  if (error || !isAuthorized(user)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ success: false, message: "Customer ID required" }, { status: 400 });
  }

  try {
    let updateData = {};
    let uploadedUrls = [];
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const { files, customerData: data } = await parseMultipart(req);
      updateData = data;
      // Upload new files
      for (const file of files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await uploadToCloudinary(buffer, file.name, file.type);
        uploadedUrls.push(url);
      }
    } else {
      updateData = await req.json();
    }

    // Get existing attachments from the database
    const existingCustomer = await Customer.findById(id);
    if (!existingCustomer) {
      return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });
    }

    let existingAttachments = existingCustomer.attachments || "";
    if (typeof existingAttachments === "string") {
      existingAttachments = existingAttachments ? existingAttachments.split(",").filter(Boolean) : [];
    } else {
      existingAttachments = [];
    }

    // If the request contains a new 'attachments' field (as string), we may want to replace?
    // Here we merge: existing + newly uploaded.
    const allUrls = [...existingAttachments, ...uploadedUrls];
    updateData.attachments = allUrls.join(",");

    // Remove _id from updateData if present
    delete updateData._id;

    const updatedCustomer = await Customer.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate("glAccount")
      .populate("assignedAgents", "name email");

    return NextResponse.json({ success: true, data: updatedCustomer }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: "Failed to update customer" }, { status: 500 });
  }
}

// ------------------- DELETE: Remove a customer -------------------
export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error } = await validateUser(req);
  if (error || !isAuthorized(user)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ success: false, message: "Customer ID required" }, { status: 400 });
  }

  try {
    const deleted = await Customer.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });
    }
    // Optionally delete Cloudinary images here (iterate over deleted.attachments URLs)
    return NextResponse.json({ success: true, message: "Customer deleted" }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}


// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Customer from "@/models/CustomerModel";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// function isAuthorized(user) {
//   if (user.type === "company") return true;
//   if (user.roles?.includes("Admin")) return true;
//   // fallback: any user with customer permission
//   return user.permissions?.includes("customer") === true;
// }

// export async function GET(req, { params }) {
//   await dbConnect();
//   const token = getTokenFromHeader(req);
//   if (!token) return NextResponse.json({ success: false, message: "Token missing" }, { status: 401 });

//   let user;
//   try { user = verifyJWT(token); } catch { return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 }); }
//   if (!isAuthorized(user)) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

//   const { id } = params;
//   const customer = await Customer.findOne({ _id: id, companyId: user.companyId });
//   if (!customer) return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });

//   return NextResponse.json({ success: true, data: customer }, { status: 200 });
// }

// export async function PUT(req, { params }) {
//   await dbConnect();
//   const token = getTokenFromHeader(req);
//   let user;
//   try { user = verifyJWT(token); } catch { return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 }); }
//   if (!isAuthorized(user)) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

//   const { id } = params;
//   const body = await req.json();

//   // Convert assignedAgents to array of ObjectId strings
//   if (Array.isArray(body.assignedAgents)) {
//     body.assignedAgents = body.assignedAgents.map(a => typeof a === "string" ? a : a?._id?._id || a?._id);
//   }

//   const updated = await Customer.findOneAndUpdate(
//     { _id: id, companyId: user.companyId },
//     { $set: body },
//     { new: true, runValidators: true }
//   );

//   if (!updated) return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });
//   return NextResponse.json({ success: true, data: updated }, { status: 200 });
// }

// export async function DELETE(req, { params }) {
//   await dbConnect();
//   const token = getTokenFromHeader(req);
//   let user;
//   try { user = verifyJWT(token); } catch { return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 }); }
//   if (!isAuthorized(user)) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });

//   const { id } = params;
//   const deleted = await Customer.findOneAndDelete({ _id: id, companyId: user.companyId });
//   if (!deleted) return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });
//   return NextResponse.json({ success: true, message: "Customer deleted" }, { status: 200 });
// }


// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Customer from "@/models/CustomerModel";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// function isAuthorized(user) {
//   if (user.type === "company") return true;
//   if (["Admin"].includes(user.role)) return true;
//   return user.permissions?.includes("customer");
// }

// export async function GET(req, { params }) {
//   await dbConnect();

//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) {
//       return NextResponse.json({ success: false, message: "Token missing" }, { status: 401 });
//     }

//     let user;
//     try {
//       user = verifyJWT(token);
//     } catch (err) {
//       return NextResponse.json({ success: false, message: "Invalid or expired token" }, { status: 401 });
//     }

//     if (!isAuthorized(user)) {
//       return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
//     }

//     const { id } = params;
//     // const customer = await Customer.findOne({ _id: id, companyId: user.companyId });
//         const customer = await Customer.findById(id);
//         if (!customer) {
//           return res.status(404).json({ success: false, message: 'Customer not found' });
//         }
//     if (!customer) {
//       return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });
//     }

//     return NextResponse.json({ success: true, data: customer }, { status: 200 });
//   } catch (error) {
//     console.error("GET /api/customers/:id error:", error);
//     return NextResponse.json({ success: false, message: "Failed to fetch customer" }, { status: 500 });
//   }
// }

// /* ================================
//    PUT /api/customers/[id]
// ================================ */
// export async function PUT(req, { params }) {
//   await dbConnect();

//   try {
//     const token = getTokenFromHeader(req);
//     let user;
//     try {
//       user = verifyJWT(token);
//     } catch {
//       return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
//     }

//     if (!isAuthorized(user)) {
//       return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
//     }

//     const { id } = params;
//     const body = await req.json();

//     // ✅ FIX: assignedAgents ko ObjectId array me convert karo
//     if (Array.isArray(body.assignedAgents)) {
//       body.assignedAgents = body.assignedAgents.map(a =>
//         typeof a === "string"
//           ? a
//           : a?._id?._id || a?._id
//       );
//     }

//     const updated = await Customer.findOneAndUpdate(
//       { _id: id, companyId: user.companyId },
//       { $set: body },
//       { new: true, runValidators: true }
//     );

//     if (!updated) {
//       return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });
//     }

//     return NextResponse.json({ success: true, data: updated }, { status: 200 });
//   } catch (error) {
//     console.error("PUT /customers/[id] error:", error);
//     return NextResponse.json({ success: false, message: "Failed to update customer" }, { status: 500 });
//   }
// }

// /* ================================
//    DELETE /api/customers/[id]
// ================================ */
// export async function DELETE(req, { params }) {
//   await dbConnect();
//   try {
//     const token = getTokenFromHeader(req);
//     let user;
//     try {
//       user = verifyJWT(token);
//     } catch {
//       return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
//     }

//     if (!isAuthorized(user)) {
//       return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 403 });
//     }

//     const { id } = params;
//     const deleted = await Customer.findOneAndDelete({ _id: id, companyId: user.companyId });

//     if (!deleted) {
//       return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });
//     }

//     return NextResponse.json({ success: true, message: "Customer deleted successfully" }, { status: 200 });
//   } catch (error) {
//     console.error("DELETE /customers/[id] error:", error);
//     return NextResponse.json({ success: false, message: "Failed to delete customer" }, { status: 500 });
//   }
// }













// import dbConnect from "@/lib/db.js";
// import Customer from "@/models/CustomerModel";
// import { NextResponse } from "next/server";


// // export async function GET(req) {
// //   try {
// //     await dbConnect();
// //     const { searchParams } = new URL(req.url);
// //     const search = searchParams.get("search");

// //     let query = {};
// //     if (search) {
// //       query = {
// //         $or: [
// //           { customerName: { $regex: search, $options: "i" } },
// //           { customerCode: { $regex: search, $options: "i" } },
// //         ],
// //       };
// //     }

// //     const customers = await Customer.find(query).select("_id customerCode customerName contactPersonName").limit(10);
// //     return NextResponse.json(customers, { status: 200 });
// //   } catch (error) {
// //     console.error("Error fetching customers:", error);
// //     return NextResponse.json({ error: "Error fetching customers" }, { status: 400 });
// //   }
// // }


// export async function GET(req, { params }) {
//   // Extract query parameters from the URL
//   const { search } = Object.fromEntries(req.nextUrl.searchParams.entries());

//   // If a search query is provided, perform a search
//   if (search) {
//     try {
//       await dbConnect();
//       // Use a case-insensitive regex to match supplier names
//       const customer = await Customer.find({
//         name: { $regex: search, $options: "i" },
//       });
//       return NextResponse.json(customer, { status: 200 });
//     } catch (error) {
//       return NextResponse.json(
//         { error: "Error searching suppliers", details: error.message },
//         { status: 400 }
//       );
//     }
//   }

//   // If params contains an id, fetch a single supplier
//   if (params && params.id) {
//     const { id } = params;
//     try {
//       await dbConnect();
//       const customers = await Customer.findById(id);
//       if (!customers) {
//         return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
//       }
//       return NextResponse.json(customers, { status: 200 });
//     } catch (error) {
//       return NextResponse.json(
//         { error: "Error fetching customers", details: error.message },
//         { status: 400 }
//       );
//     }
//   }

//   // If no search query and no id, return all suppliers
//   try {
//     await dbConnect();
//     const suppliers = await Supplier.find({});
//     return NextResponse.json(suppliers, { status: 200 });
//   } catch (error) {
//     return NextResponse.json(
//       { error: "Error fetching suppliers", details: error.message },
//       { status: 400 }
//     );
//   }
// }

// export async function PUT(req, { params }) {
//   const { id } = params; // Use id here
//   try {
//     const data = await req.json();
//     const customer = await Customer.findByIdAndUpdate(id, data, { new: true }); // Update customer by id
//     if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
//     return NextResponse.json(customer, { status: 200 });
//   } catch (error) {
//     return NextResponse.json({ error: "Error updating customer" }, { status: 400 });
//   }
// }

// export async function DELETE(req, { params }) {
//   const { id } = params; // Ensure the parameter is named id

//   if (!id) {
//     return NextResponse.json({ error: "Customer id is required" }, { status: 400 });
//   }

//   try {
//     const deletedCustomer = await Customer.findByIdAndDelete(id); // Delete customer by id

//     if (!deletedCustomer) {
//       return NextResponse.json({ error: "Customer not found" }, { status: 404 });
//     }

//     return NextResponse.json({ success: "Customer deleted successfully" }, { status: 200 });
//   } catch (error) {
//     return NextResponse.json({ error: "Error deleting customer" }, { status: 500 });
//   }
// }
