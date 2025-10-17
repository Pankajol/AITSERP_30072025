import dbConnect from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const SECRET = process.env.JWT_SECRET;

// ─── Helper ───
function verifyCompany(req) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const [, token] = authHeader.split(" ");
    if (!token) throw new Error("Unauthorized");

    const decoded = jwt.verify(token, SECRET);
    if (!decoded || decoded.type !== "company") throw new Error("Forbidden");

    return decoded;
  } catch (err) {
    throw new Error(err.message || "Unauthorized");
  }
}

// ─── PUT /api/company/users/[id] ───
export async function PUT(req, { params }) {
  try {
    const company = verifyCompany(req);
    const { id } = params;
    const body = await req.json();

    await dbConnect();

    const updateData = {
      name: body.name,
      email: body.email,
      roles: Array.isArray(body.roles) ? body.roles : [],
      modules: body.modules || {},
    };

    if (body.password && body.password.trim() !== "") {
      updateData.password = await bcrypt.hash(body.password, 10);
    }

    const user = await CompanyUser.findOneAndUpdate(
      { _id: id, companyId: company.companyId },
      updateData,
      { new: true }
    ).select("-password");

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User updated successfully", user });
  } catch (e) {
    const status = /Unauthorized|Forbidden|Missing/.test(e.message) ? 401 : 500;
    return NextResponse.json({ success: false, message: e.message }, { status });
  }
}

// ─── DELETE /api/company/users/[id] ───
export async function DELETE(req, { params }) {
  try {
    const company = verifyCompany(req);
    const { id } = params;

    await dbConnect();

    const deleted = await CompanyUser.findOneAndDelete({
      _id: id,
      companyId: company.companyId,
    });

    if (!deleted) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (e) {
    const status = /Unauthorized|Forbidden|Missing/.test(e.message) ? 401 : 500;
    return NextResponse.json({ success: false, message: e.message }, { status });
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

// // ─── PUT /api/company/users/:id ───
// export async function PUT(req, { params }) {
//   try {
//     const company = verifyCompany(req);
//     const userId = params.id;
//     const { name, email, password, roles = [], subRoles = [] } = await req.json();

//     if (!name || !email)
//       return NextResponse.json({ message: "Name and email are required" }, { status: 400 });

//     if (!Array.isArray(roles) || roles.some((r) => !VALID_ROLES.includes(r)))
//       return NextResponse.json({ message: "Invalid roles" }, { status: 400 });

//     await dbConnect();

//     const user = await CompanyUser.findOne({ _id: userId, companyId: company.companyId });
//     if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

//     user.name = name;
//     user.email = email;
//     user.roles = roles;
//     user.subRoles = subRoles;

//     if (password) {
//       user.password = await bcrypt.hash(password, 10);
//     }

//     await user.save();

//     return NextResponse.json(
//       { id: user._id, name: user.name, email: user.email, roles: user.roles, subRoles: user.subRoles },
//       { status: 200 }
//     );
//   } catch (e) {
//     const status = /Unauthorized|Forbidden/.test(e.message) ? 401 : 500;
//     return NextResponse.json({ message: e.message }, { status });
//   }
// }

// // ─── DELETE /api/company/users/:id ───
// export async function DELETE(req, { params }) {
//   try {
//     const company = verifyCompany(req);
//     const userId = params.id;

//     await dbConnect();

//     const user = await CompanyUser.findOneAndDelete({ _id: userId, companyId: company.companyId });
//     if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

//     return NextResponse.json({ message: "User deleted successfully" }, { status: 200 });
//   } catch (e) {
//     const status = /Unauthorized|Forbidden/.test(e.message) ? 401 : 500;
//     return NextResponse.json({ message: e.message }, { status });
//   }
// }

