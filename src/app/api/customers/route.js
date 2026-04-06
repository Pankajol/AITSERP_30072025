import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import Customer from "@/models/CustomerModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = ["admin","crm","sales manager","purchase manager","inventory manager","accounts manager","hr manager","support executive","production head","project manager"];
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

export async function GET(req) {
  await dbConnect();
  const { user, error } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status: 401 });
  if (!isAuthorized(user)) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

  try {
    const customers = await Customer.find({ companyId: user.companyId })
      .populate("assignedAgents", "name email")
      .populate("glAccount", "accountName accountCode");
    return NextResponse.json({ success: true, data: customers }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error } = await validateUser(req);
  if (error || !isAuthorized(user)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const customer = new Customer({
      ...body,
      companyId: user.companyId,
      createdBy: user.id,
    });
    await customer.save();
    const populated = await Customer.findById(customer._id).populate("glAccount");
    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: "Failed to create customer" }, { status: 500 });
  }
}




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


