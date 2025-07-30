import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CompanyUser from '@/models/CompanyUser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

const VALID_ROLES = [
  'Admin',
  'Sales Manager',
  'Purchase Manager',
  'Inventory Manager',
  'Accounts Manager',
  'HR Manager',
  'Support Executive',
  'Production Head',
];

/* ─── helper: verify JWT and ensure company type ─── */
function verifyCompany(req) {
  const auth = req.headers.get('authorization') || '';
  const [, token] = auth.split(' ');
  if (!token) throw new Error('Unauthorized');
  const d = jwt.verify(token, SECRET);
  if (d.type !== 'company') throw new Error('Forbidden');
  return d; // { id, email, type: 'company', … }
}

/* ───────── GET  /api/company/users ───────── */
export async function GET(req) {
  try {
    const company = verifyCompany(req);
    await dbConnect();
    const users = await CompanyUser.find({ companyId: company.id })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(users);
  } catch (e) {
    const status = /Unauthorized|Forbidden/.test(e.message) ? 401 : 500;
    return NextResponse.json({ message: e.message }, { status });
  }
}

/* ───────── POST  /api/company/users ───────── */
export async function POST(req) {
  try {
    const company = verifyCompany(req);
    const { name, email, password, roles = [] } = await req.json();

    if (!name || !email || !password)
      return NextResponse.json(
        { message: 'name, email, password required' },
        { status: 400 }
      );

    if (
      !Array.isArray(roles) ||
      roles.length === 0 ||
      roles.some((r) => !VALID_ROLES.includes(r))
    )
      return NextResponse.json({ message: 'Invalid roles' }, { status: 400 });

    await dbConnect();

    const dup = await CompanyUser.findOne({ companyId: company.id, email });
    if (dup)
      return NextResponse.json({ message: 'Email already exists' }, { status: 409 });

    const hash = await bcrypt.hash(password, 10);
    const user = await CompanyUser.create({
      companyId: company.id,
      name,
      email,
      password: hash,
      roles,
    });

    return NextResponse.json(
      { id: user._id, name: user.name, email: user.email, roles: user.roles },
      { status: 201 }
    );
  } catch (e) {
    const status = /Unauthorized|Forbidden/.test(e.message) ? 401 : 500;
    return NextResponse.json({ message: e.message }, { status });
  }
}



///07/2025
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
// ];

// // ────────────── Auth helper ──────────────
// function verifyCompany(req) {
//   const auth = req.headers.get('authorization') || '';
//   const [, token] = auth.split(' ');
//   if (!token) throw new Error('Unauthorized');
//   const decoded = jwt.verify(token, SECRET);
//   if (decoded.type !== 'company') throw new Error('Forbidden');
//   return decoded; // { id, email, type: 'company', ... }
// }

// // ────────────── GET: List all users ──────────────
// export async function GET(req) {
//   try {
//     const company = verifyCompany(req);
//     await dbConnect();
//     const users = await CompanyUser.find({ companyId: company.id })
//       .select('-password')
//       .sort({ createdAt: -1 })
//       .lean();

//     return NextResponse.json(users, { status: 200 });
//   } catch (e) {
//     const status = /Unauthorized|Forbidden/.test(e.message) ? 401 : 500;
//     return NextResponse.json({ message: e.message }, { status });
//   }
// }

// // ────────────── POST: Create a new user ──────────────
// export async function POST(req) {
//   try {
//     const company = verifyCompany(req);
//     const { name, email, password, roles = [] } = await req.json();

//     if (!name || !email || !password)
//       return NextResponse.json({ message: 'name, email, password required' }, { status: 400 });

//     if (!Array.isArray(roles) || roles.some((r) => !VALID_ROLES.includes(r)))
//       return NextResponse.json({ message: 'Invalid roles' }, { status: 400 });

//     await dbConnect();

//     const exists = await CompanyUser.findOne({ companyId: company.id, email });
//     if (exists)
//       return NextResponse.json({ message: 'Email already exists' }, { status: 409 });

//     const hash = await bcrypt.hash(password, 10);
//     const user = await CompanyUser.create({
//       companyId: company.id,
//       name,
//       email,
//       password: hash,
//       roles,
//     });

//     return NextResponse.json(
//       {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         roles: user.roles,
//       },
//       { status: 201 }
//     );
//   } catch (e) {
//     const status = /Unauthorized|Forbidden/.test(e.message) ? 401 : 500;
//     return NextResponse.json({ message: e.message }, { status });
//   }
// }



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
// ];

// /* ─ helper: verify JWT and ensure it’s a company token ─ */
// function verifyCompany(req) {
//   const auth = req.headers.get('authorization') || '';
//   const [, token] = auth.split(' ');
//   if (!token) throw new Error('Unauthorized');
//   const d = jwt.verify(token, SECRET);
//   if (d.type !== 'company') throw new Error('Forbidden');
//   return d; // { id, email, type:'company', ... }
// }

// /* ───────────── GET  /api/company/users ───────────── */
// export async function GET(req) {
//   try {
//     const company = verifyCompany(req);
//     await dbConnect();
//     const users = await CompanyUser.find({ companyId: company.id })
//                      .select('-password')
//                      .sort({ createdAt: -1 })
//                      .lean();
//     return NextResponse.json(users, { status: 200 });
//   } catch (e) {
//     const status = /Unauthorized|Forbidden/.test(e.message) ? 401 : 500;
//     return NextResponse.json({ message: e.message }, { status });
//   }
// }

// /* ───────────── POST  /api/company/users ──────────── */
// export async function POST(req) {
//   try {
//     const company = verifyCompany(req);
//     const { name, email, password, role = 'Sales Manager' } = await req.json();

//     if (!name || !email || !password)
//       return NextResponse.json({ message: 'name, email, password required' }, { status: 400 });

//     if (!VALID_ROLES.includes(role))
//       return NextResponse.json({ message: 'Invalid role' }, { status: 400 });

//     await dbConnect();
//     const dup = await CompanyUser.findOne({ companyId: company.id, email });
//     if (dup)
//       return NextResponse.json({ message: 'Email already exists' }, { status: 409 });

//     const hash = await bcrypt.hash(password, 10);
//     const user = await CompanyUser.create({
//       companyId: company.id,
//       name,
//       email,
//       password: hash,
//       role,
//     });

//     return NextResponse.json(
//       { id: user._id, name: user.name, email: user.email, role: user.role },
//       { status: 201 }
//     );
//   } catch (e) {
//     const status = /Unauthorized|Forbidden/.test(e.message) ? 401 : 500;
//     return NextResponse.json({ message: e.message }, { status });
//   }
// }
