// import { NextResponse } from 'next/server';
// import dbConnect from '@/lib/db';
// import CompanyUser from '@/models/CompanyUser';
// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';

// const SECRET = process.env.JWT_SECRET;

// /* ───────── POST /api/login ───────── */
// export async function POST(req) {
//   try {
//     const { email, password, companyId } = await req.json();

//     // 1. ✅ VALIDATION: Ensure all required fields are present.
//     if (!email || !password || !companyId) {
//       return NextResponse.json(
//         { message: 'Email, password, and companyId are required' },
//         { status: 400 }
//       );
//     }

//     await dbConnect();

//     // 2. ✅ SECURITY FIX: Find the user by both email AND companyId.
//     // This prevents a user from one company from accessing another.
//     const user = await CompanyUser.findOne({ email, companyId });
//     if (!user) {
//       // Keep the error message generic to prevent user enumeration attacks.
//       return NextResponse.json(
//         { message: 'Invalid credentials' },
//         { status: 401 }
//       );
//     }

//     // 3. ✅ VALIDATE PASSWORD: Check if the provided password matches the hashed password.
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return NextResponse.json(
//         { message: 'Invalid credentials' },
//         { status: 401 }
//       );
//     }

//     // 4. ✅ GENERATE JWT: Create the token with all necessary user info for the frontend.
//     const token = jwt.sign(
//       {
//         id: user._id,
//         name: user.name, // Added for UI greetings (e.g., "Hello, John")
//         email: user.email,
//         companyId: user.companyId,
//         roles: user.roles || [], // Added fallback for safety
//         modules: user.modules || {}, // Added modules for sidebar permissions
//         type: 'user', // Corrected type to 'user'
//       },
//       SECRET,
//       { expiresIn: '7d' }
//     );

//     // 5. ✅ PREPARE RESPONSE: Remove sensitive fields before sending the user object.
//     const { password: _, __v, ...safeUser } = user.toObject();

//     return NextResponse.json({ token, user: safeUser });
    
//   } catch (e) {
//     console.error('User login error:', e);
//     return NextResponse.json({ message: 'Server error' }, { status: 500 });
//   }
// }




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
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // 🔐 Find user
    const user = await CompanyUser.findOne({ email });
    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // 🔐 Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // ✅ Convert modules Map to plain object
    const modules = user.modules ? Object.fromEntries(user.modules) : {};

    // ✅ Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        companyId: user.companyId,
        email: user.email,
        roles: Array.isArray(user.roles) ? user.roles : [],
        modules,
        type: 'user',
      },
      SECRET,
      { expiresIn: '1d' }
    );

    // ✅ Remove sensitive fields
    const { password: _, __v, ...safeUser } = user.toObject();
    safeUser.modules = modules;

    return NextResponse.json({ token, user: safeUser });
  } catch (e) {
    console.error('Login error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

