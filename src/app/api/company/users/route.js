import dbConnect from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const SECRET = process.env.JWT_SECRET;

// --- VALID ROLES (matches frontend ROLE_OPTIONS keys) ---
const VALID_ROLES = [
  "Admin",
  "Sales Manager",
  "Purchase Manager",
  "Inventory Manager",
  "Accounts Manager",
  "HR Manager",
  "Agent",
  "Production Head",
  "Project Manager",
  "Employee",
];

// ─── Helper ───
function verifyCompany(req) {
  const auth = req.headers.get("authorization") || "";
  const [, token] = auth.split(" ");
  if (!token) throw new Error("Unauthorized");
  const decoded = jwt.verify(token, SECRET);
  if (decoded.type !== "company") throw new Error("Forbidden");
  return decoded;
}

// ─── GET /api/company/users ───
export async function GET(req) {
  try {
    const decoded = verifyCompany(req);
    await dbConnect();

    let query = { companyId: decoded.companyId };

    if (decoded.roles?.includes("Project Manager")) {
      query.roles = "Employee";
    } else if (decoded.roles?.includes("Employee")) {
      query._id = decoded.id;
    }

    const users = await CompanyUser.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(users);
  } catch (e) {
    console.error("GET /api/company/users error:", e);
    const status = /Unauthorized|Forbidden/.test(e.message) ? 401 : 500;
    return NextResponse.json({ message: e.message }, { status });
  }
}

// ─── POST /api/company/users ───
// ─── POST /api/company/users ───
export async function POST(req) {
  try {
    const company = verifyCompany(req);
    const { employeeId, name, email, password, roles = [], modules = {} } =
      await req.json();

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(roles) || roles.length === 0) {
      return NextResponse.json(
        { message: "At least one role required" },
        { status: 400 }
      );
    }

    const invalidRole = roles.find((r) => !VALID_ROLES.includes(r));
    if (invalidRole) {
      return NextResponse.json(
        { message: `Invalid role: ${invalidRole}` },
        { status: 400 }
      );
    }

    if (typeof modules !== "object" || Array.isArray(modules)) {
      return NextResponse.json(
        { message: "Modules must be an object" },
        { status: 400 }
      );
    }

    await dbConnect();

    const dup = await CompanyUser.findOne({
      companyId: company.companyId,
      email,
    });
    if (dup) {
      return NextResponse.json(
        { message: "Email already exists" },
        { status: 409 }
      );
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await CompanyUser.create({
      companyId: company.companyId,
      employeeId: employeeId || undefined, // ✅ optional employee link
      name,
      email,
      password: hash,
      roles,
      modules,
    });

    // ✅ JUST RETURN DATA (NO localStorage here)
    return NextResponse.json(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        modules: user.modules,
        employeeId: user.employeeId || null,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/company/users error:", e);
    const status = /Unauthorized|Forbidden/.test(e.message) ? 401 : 500;
    return NextResponse.json({ message: e.message }, { status });
  }
}





// import dbConnect from "@/lib/db";
// import CompanyUser, { VALID_ROLES } from "@/models/CompanyUser";
// import { NextResponse } from "next/server";
// import jwt from "jsonwebtoken";
// import bcrypt from "bcryptjs";

// const SECRET = process.env.JWT_SECRET;

// // ─── Helper ───
// function verifyCompany(req) {
//   const auth = req.headers.get("authorization") || "";
//   const [, token] = auth.split(" ");
//   if (!token) throw new Error("Unauthorized");
//   const decoded = jwt.verify(token, SECRET);
//   if (decoded.type !== "company") throw new Error("Forbidden");
//   return decoded;
// }

// // ─── GET /api/company/users ───
// export async function GET(req) {
//   try {
//     const decoded = verifyCompany(req);
//     await dbConnect();

//     let query = { companyId: decoded.companyId };

//     if (decoded.roles?.includes("Project Manager")) query.roles = "Employee";
//     else if (decoded.roles?.includes("Employee")) query._id = decoded.id;

//     const users = await CompanyUser.find(query)
//       .select("-password")
//       .sort({ createdAt: -1 })
//       .lean();

//     return NextResponse.json(users);
//   } catch (e) {
//     const status = /Unauthorized|Forbidden/.test(e.message) ? 401 : 500;
//     return NextResponse.json({ message: e.message }, { status });
//   }
// }

// // ─── POST /api/company/users ───
// export async function POST(req) {
//   try {
//     const company = verifyCompany(req);
//     const { name, email, password, roles = [], subRoles = [] } = await req.json();

//     if (!name || !email || !password)
//       return NextResponse.json(
//         { message: "name, email, password required" },
//         { status: 400 }
//       );

//     if (!Array.isArray(roles) || !roles.length || roles.some((r) => !VALID_ROLES.includes(r)))
//       return NextResponse.json({ message: "Invalid roles" }, { status: 400 });

//     await dbConnect();

//     const dup = await CompanyUser.findOne({ companyId: company.companyId, email });
//     if (dup) return NextResponse.json({ message: "Email already exists" }, { status: 409 });

//     const hash = await bcrypt.hash(password, 10);

//     const user = await CompanyUser.create({
//       companyId: company.companyId,
//       name,
//       email,
//       password: hash,
//       roles,
//       subRoles,
//     });

//     return NextResponse.json(
//       { id: user._id, name: user.name, email: user.email, roles: user.roles, subRoles: user.subRoles },
//       { status: 201 }
//     );
//   } catch (e) {
//     const status = /Unauthorized|Forbidden/.test(e.message) ? 401 : 500;
//     return NextResponse.json({ message: e.message }, { status });
//   }
// }







