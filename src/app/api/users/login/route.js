import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import CompanyUser from '@/models/CompanyUser';
import Company from '@/models/Company'; // ✅ Import Company model
import Employee from '@/models/hr/Employee';
import Constituency from '@/models/election/Constituency';
import Booth from '@/models/election/Booth';
import Block from '@/models/election/Block';
import Ward from '@/models/election/Ward';
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

    // Find user and populate assigned references
    const user = await CompanyUser.findOne({ email })
      .populate("employeeId")
      .populate("assignedConstituency", "_id name")
      .populate("assignedBlock", "_id blockNumber name")
      .populate("assignedWard", "_id wardNumber name")
      .populate("assignedBooths", "_id boothNumber name");

    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // ─── Check company subscription ──────────────────────────────
    let isExpired = false;
    let companyData = null;
    if (user.companyId) {
      const company = await Company.findById(user.companyId);
      if (company) {
        companyData = company;
        const now = new Date();
        if (company.subscriptionStatus === 'expired') {
          isExpired = true;
        } else if (company.subscriptionStatus === 'trialing' && company.trialEndsAt && now > company.trialEndsAt) {
          isExpired = true;
        } else if (company.subscriptionStatus === 'active' && company.currentPeriodEnd && now > company.currentPeriodEnd) {
          isExpired = true;
        }
        if (isExpired) {
          company.subscriptionStatus = 'expired';
          await company.save();
        }
      }
    }

    // Convert modules Map to plain object
    const modules = user.modules ? Object.fromEntries(user.modules) : {};

    // Prepare assigned objects for token (only IDs or full objects)
    const assignedConstituency = user.assignedConstituency ? {
      _id: user.assignedConstituency._id,
      name: user.assignedConstituency.name
    } : null;

    const assignedBlock = user.assignedBlock ? {
      _id: user.assignedBlock._id,
      blockNumber: user.assignedBlock.blockNumber,
      name: user.assignedBlock.name
    } : null;

    const assignedWard = user.assignedWard ? {
      _id: user.assignedWard._id,
      wardNumber: user.assignedWard.wardNumber,
      name: user.assignedWard.name
    } : null;

    const assignedBooths = user.assignedBooths ? user.assignedBooths.map(b => ({
      _id: b._id,
      boothNumber: b.boothNumber,
      name: b.name
    })) : [];

    // ─── Generate JWT with assignment fields and expired flag ───
    const token = jwt.sign(
      {
        id: user._id,
        companyId: user.companyId,
        email: user.email,
        roles: Array.isArray(user.roles) ? user.roles : [],
        modules,
        type: 'user',
        employeeId: user.employeeId?._id || user.employeeId,
        // Worker assignment fields
        assignedConstituency,
        assignedBlock,
        assignedWard,
        assignedBooths,
        // ✅ Subscription expiry flag
        expired: isExpired,
        companySubscriptionStatus: companyData?.subscriptionStatus || 'active',
      },
      SECRET,
      { expiresIn: '1d' }
    );

    console.log("✅ JWT payload includes assignments and expired flag:", {
      assignedConstituency,
      assignedBlock,
      assignedWard,
      assignedBooths: assignedBooths.length,
      expired: isExpired,
    });

    // Remove sensitive fields for response
    const { password: _, __v, ...safeUser } = user.toObject();
    safeUser.modules = modules;
    safeUser.employeeId = user.employeeId?._id || user.employeeId;
    safeUser.assignedConstituency = assignedConstituency;
    safeUser.assignedBlock = assignedBlock;
    safeUser.assignedWard = assignedWard;
    safeUser.assignedBooths = assignedBooths;
    // ✅ Add expired flag to response
    safeUser.expired = isExpired;
    safeUser.companySubscriptionStatus = companyData?.subscriptionStatus || 'active';

    return NextResponse.json({ token, user: safeUser });
  } catch (e) {
    console.error('Login error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}




// import { NextResponse } from 'next/server';
// import dbConnect from '@/lib/db';
// import CompanyUser from '@/models/CompanyUser';
// import Employee from '@/models/hr/Employee';
// import Constituency from '@/models/election/Constituency';
// import Booth from '@/models/election/Booth';
// import Block from '@/models/election/Block';
// import Ward from '@/models/election/Ward';
// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
// import { jwtDecode } from 'jwt-decode';

// const SECRET = process.env.JWT_SECRET;

// export async function POST(req) {
//   try {
//     const { email, password } = await req.json();

//     if (!email || !password) {
//       return NextResponse.json(
//         { message: 'Email and password are required' },
//         { status: 400 }
//       );
//     }

//     await dbConnect();

//     // Find user and populate assigned references
//     const user = await CompanyUser.findOne({ email })
//       .populate("employeeId")
//       .populate("assignedConstituency", "_id name")
//       .populate("assignedBlock", "_id blockNumber name")
//       .populate("assignedWard", "_id wardNumber name")
//       .populate("assignedBooths", "_id boothNumber name");

//     if (!user) {
//       return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
//     }

//     // Validate password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
//     }

//     // Convert modules Map to plain object
//     const modules = user.modules ? Object.fromEntries(user.modules) : {};

//     // Prepare assigned objects for token (only IDs or full objects)
//     const assignedConstituency = user.assignedConstituency ? {
//       _id: user.assignedConstituency._id,
//       name: user.assignedConstituency.name
//     } : null;

//     const assignedBlock = user.assignedBlock ? {
//       _id: user.assignedBlock._id,
//       blockNumber: user.assignedBlock.blockNumber,
//       name: user.assignedBlock.name
//     } : null;

//     const assignedWard = user.assignedWard ? {
//       _id: user.assignedWard._id,
//       wardNumber: user.assignedWard.wardNumber,
//       name: user.assignedWard.name
//     } : null;

//     const assignedBooths = user.assignedBooths ? user.assignedBooths.map(b => ({
//       _id: b._id,
//       boothNumber: b.boothNumber,
//       name: b.name
//     })) : [];

//     // Generate JWT with assignment fields
//     const token = jwt.sign(
//       {
//         id: user._id,
//         companyId: user.companyId,
//         email: user.email,
//         roles: Array.isArray(user.roles) ? user.roles : [],
//         modules,
//         type: 'user',
//         employeeId: user.employeeId?._id || user.employeeId,
//         // ✅ Worker assignment fields
//         assignedConstituency,
//         assignedBlock,
//         assignedWard,
//         assignedBooths,
//       },
//       SECRET,
//       { expiresIn: '1d' }
//     );

//     console.log("✅ JWT payload includes assignments:", {
//       assignedConstituency,
//       assignedBlock,
//       assignedWard,
//       assignedBooths: assignedBooths.length
//     });

//     // Remove sensitive fields for response
//     const { password: _, __v, ...safeUser } = user.toObject();
//     safeUser.modules = modules;
//     safeUser.employeeId = user.employeeId?._id || user.employeeId;
//     safeUser.assignedConstituency = assignedConstituency;
//     safeUser.assignedBlock = assignedBlock;
//     safeUser.assignedWard = assignedWard;
//     safeUser.assignedBooths = assignedBooths;

//     return NextResponse.json({ token, user: safeUser });
//   } catch (e) {
//     console.error('Login error:', e);
//     return NextResponse.json({ message: 'Server error' }, { status: 500 });
//   }
// }




// // /app/api/login/route.js
// import { NextResponse } from 'next/server';
// import dbConnect from '@/lib/db';
// import CompanyUser from '@/models/CompanyUser';
// import Employee from '@/models/hr/Employee';
// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
// import {jwtDecode} from 'jwt-decode';


// const SECRET = process.env.JWT_SECRET;

// export async function POST(req) {
//   try {
//     const { email, password } = await req.json();

//     if (!email || !password) {
//       return NextResponse.json(
//         { message: 'Email and password are required' },
//         { status: 400 }
//       );
//     }

//     await dbConnect();

//     // 🔐 Find user
//     const user = await CompanyUser.findOne({ email })
//       .populate("employeeId");
//     if (!user) {
//       return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
//     }

//     // 🔐 Validate password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
//     }

//     // ✅ Convert modules Map to plain object
//     const modules = user.modules ? Object.fromEntries(user.modules) : {};

//     // ✅ Generate JWT
//     const token = jwt.sign(
//       {
//         id: user._id,
//         companyId: user.companyId,
//         email: user.email,
//         roles: Array.isArray(user.roles) ? user.roles : [],
//         modules,
//         type: 'user',
//         employeeId: user.employeeId?._id || user.employeeId, // Handle both populated and non-populated cases
//       },
//       SECRET,
//       { expiresIn: '1d' }

//     );
//     // add console log to verify token payload
//      console.log(jwtDecode(token));
//       console.log(JSON.stringify(user.modules, null, 2));
      

//     // ✅ Remove sensitive fields
//     const { password: _, __v, ...safeUser } = user.toObject();
//     safeUser.modules = modules;
//     safeUser.employeeId = user.employeeId?._id || user.employeeId;
//     console.log(jwtDecode(token));
//     console.log(JSON.stringify(user.modules, null, 2));

//     return NextResponse.json({ token, user: safeUser });
//   } catch (e) {
//     console.error('Login error:', e);
//     return NextResponse.json({ message: 'Server error' }, { status: 500 });
//   }
// }

