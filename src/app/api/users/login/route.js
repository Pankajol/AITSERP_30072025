// /app/api/login/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CompanyUser from '@/models/CompanyUser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

/* ───────── POST /api/login ───────── */
export async function POST(req) {
  try {
    const { email, password, companyId } = await req.json();

    if (!email || !password ) {
      return NextResponse.json(
        { message: 'Email, password, and companyId are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // 🔐 Find user tied to company
    const user = await CompanyUser.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid email, password, or company' },
        { status: 401 }
      );
    }

    // 🔐 Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { message: 'Invalid email, password, or company' },
        { status: 401 }
      );
    }

    // ✅ Generate JWT with company scoping
    const token = jwt.sign(
      {
        id: user._id,
        companyId: user.companyId,
        email: user.email,
        roles: Array.isArray(user.roles) ? user.roles : [],
        subRoles: Array.isArray(user.subRoles) ? user.subRoles : [],
        type: 'company', // important for verifyCompany
      },
      SECRET,
      { expiresIn: '7d' }
    );

    // ✅ Remove sensitive fields before returning
    const { password: _, __v, ...safeUser } = user.toObject();

    return NextResponse.json({ token, user: safeUser });
  } catch (e) {
    console.error('User login error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}




// // /app/api/login/route.js
// import { NextResponse } from 'next/server';
// import dbConnect from '@/lib/db';
// import CompanyUser from '@/models/CompanyUser';
// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';

// const SECRET = process.env.JWT_SECRET;

// export async function POST(req) {
//   try {
//     const { email, password } = await req.json();
//     if (!email || !password) {
//       return NextResponse.json({ message: 'Email and password required' }, { status: 400 });
//     }

//     await dbConnect();
//     const user = await CompanyUser.findOne({ email });
//     if (!user) {
//       return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
//     }

//     const token = jwt.sign(
//       {
//         id: user._id,
//         companyId: user.companyId,
//         email: user.email,
//         roles: Array.isArray(user.roles) ? user.roles : [], // ✅ roles must be array
//         type: 'company', // ✅ required to pass verifyCompany
//       },
//       SECRET,
//       { expiresIn: '7d' }
//     );

//     const { password: _, ...safeUser } = user.toObject();

//     return NextResponse.json({ token, user: safeUser });
//   } catch (e) {
//     console.error('User login error:', e);
//     return NextResponse.json({ message: 'Server error' }, { status: 500 });
//   }
// }


