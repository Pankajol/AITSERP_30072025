
import dbConnect from "@/lib/db";
import CompanyUser, { VALID_ROLES } from "@/models/CompanyUser";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const SECRET = process.env.JWT_SECRET;

// ─── Helper ───
function verifyCompany(req) {
  const auth = req.headers.get("authorization") || "";
  const [, token] = auth.split(" ");
  if (!token) throw new Error("Unauthorized");
  const decoded = jwt.verify(token, SECRET);
  if (decoded.type !== "company") throw new Error("Forbidden");
  return decoded;
}

// ─── PUT /api/company/users/:id ───
export async function PUT(req, { params }) {
  try {
    const company = verifyCompany(req);
    const userId = params.id;
    const { name, email, password, roles = [], subRoles = [] } = await req.json();

    if (!name || !email)
      return NextResponse.json({ message: "Name and email are required" }, { status: 400 });

    if (!Array.isArray(roles) || roles.some((r) => !VALID_ROLES.includes(r)))
      return NextResponse.json({ message: "Invalid roles" }, { status: 400 });

    await dbConnect();

    const user = await CompanyUser.findOne({ _id: userId, companyId: company.companyId });
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    user.name = name;
    user.email = email;
    user.roles = roles;
    user.subRoles = subRoles;

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();

    return NextResponse.json(
      { id: user._id, name: user.name, email: user.email, roles: user.roles, subRoles: user.subRoles },
      { status: 200 }
    );
  } catch (e) {
    const status = /Unauthorized|Forbidden/.test(e.message) ? 401 : 500;
    return NextResponse.json({ message: e.message }, { status });
  }
}

// ─── DELETE /api/company/users/:id ───
export async function DELETE(req, { params }) {
  try {
    const company = verifyCompany(req);
    const userId = params.id;

    await dbConnect();

    const user = await CompanyUser.findOneAndDelete({ _id: userId, companyId: company.companyId });
    if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

    return NextResponse.json({ message: "User deleted successfully" }, { status: 200 });
  } catch (e) {
    const status = /Unauthorized|Forbidden/.test(e.message) ? 401 : 500;
    return NextResponse.json({ message: e.message }, { status });
  }
}




// import { NextResponse } from 'next/server';
// import dbConnect from '@/lib/db';
// import CompanyUser from '@/models/CompanyUser';
// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';

// const SECRET = process.env.JWT_SECRET;

// const VALID_ROLES = [
//   'Admin',
//   'Sales Manager',
//   'Purchase Manager',
//   'Inventory Manager',
//   'Accounts Manager',
//   'HR Manager',
//   'Support Executive',
//   'Production Head',
//   'Project Manager',
//   'Employee',
// ];

// function verifyCompany(req) {
//   const auth = req.headers.get('authorization') || '';
//   const [, token] = auth.split(' ');
//   if (!token) throw new Error('Unauthorized');
//   const d = jwt.verify(token, SECRET);
//   if (d.type !== 'company') throw new Error('Forbidden');
//   return d;
// }

// /* ───────── GET  /api/company/users/[id] ───────── */
// export async function GET(req, { params }) {
//   try {
//     const company = verifyCompany(req);
//     await dbConnect();
//     const user = await CompanyUser.findOne({
//       _id: params.id,
//       companyId: company.id,
//     })
//       .select('-password')
//       .lean();
//     if (!user)
//       return NextResponse.json({ message: 'User not found' }, { status: 404 });
//     return NextResponse.json(user);
//   } catch (e) {
//     const status = /Unauthorized|Forbidden/.test(e.message) ? 401 : 500;
//     return NextResponse.json({ message: e.message }, { status });
//   }
// }

// /* ───────── PUT  /api/company/users/[id] ───────── */
// export async function PUT(req, { params }) {
//   try {
//     const company = verifyCompany(req);
//     const { name, email, password, roles = [] } = await req.json();

//     if (!name || !email)
//       return NextResponse.json({ message: 'name and email required' }, { status: 400 });

//     if (
//       !Array.isArray(roles) ||
//       roles.length === 0 ||
//       roles.some((r) => !VALID_ROLES.includes(r))
//     )
//       return NextResponse.json({ message: 'Invalid roles' }, { status: 400 });

//     await dbConnect();

//     const user = await CompanyUser.findOne({
//       _id: params.id,
//       companyId: company.id,
//     });
//     if (!user)
//       return NextResponse.json({ message: 'User not found' }, { status: 404 });

//     user.name = name;
//     user.email = email;
//     user.roles = roles;
//     if (password) user.password = await bcrypt.hash(password, 10);

//     await user.save();

//     return NextResponse.json({
//       id: user._id,
//       name: user.name,
//       email: user.email,
//       roles: user.roles,
//     });
//   } catch (e) {
//     const status = /Unauthorized|Forbidden/.test(e.message) ? 401 : 500;
//     return NextResponse.json({ message: e.message }, { status });
//   }
// }

// /* ───────── DELETE  /api/company/users/[id] ───────── */
// export async function DELETE(req, { params }) {
//   try {
//     const company = verifyCompany(req);
//     await dbConnect();
//     const res = await CompanyUser.deleteOne({
//       _id: params.id,
//       companyId: company.id,
//     });
//     if (res.deletedCount === 0)
//       return NextResponse.json({ message: 'User not found' }, { status: 404 });
//     return NextResponse.json({ ok: true }, { status: 204 });
//   } catch (e) {
//     const status = /Unauthorized|Forbidden/.test(e.message) ? 401 : 500;
//     return NextResponse.json({ message: e.message }, { status });
//   }
// }
