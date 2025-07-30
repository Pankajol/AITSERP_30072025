// /app/api/login/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CompanyUser from '@/models/CompanyUser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password required' }, { status: 400 });
    }

    await dbConnect();
    const user = await CompanyUser.findOne({ email });
    if (!user) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    const token = jwt.sign(
      {
        id: user._id,
        companyId: user.companyId,
        email: user.email,
        roles: Array.isArray(user.roles) ? user.roles : [], // ✅ roles must be array
        type: 'company', // ✅ required to pass verifyCompany
      },
      SECRET,
      { expiresIn: '7d' }
    );

    const { password: _, ...safeUser } = user.toObject();

    return NextResponse.json({ token, user: safeUser });
  } catch (e) {
    console.error('User login error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}



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
//         role: user.role,
//         type: 'user',
//         permissions: user.permissions,
//       },
//       SECRET,
//       { expiresIn: '7d' }
//     );

//     return NextResponse.json({ token, user });
//   } catch (e) {
//     console.error('User login error:', e);
//     return NextResponse.json({ message: 'Server error' }, { status: 500 });
//   }
// }
