import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Company from '@/models/Company';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password required' }, { status: 400 });
    }

    await dbConnect();
    const company = await Company.findOne({ email }).select("+password");

    if (!company) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, company.password);
    if (!isMatch) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    // ─── Check subscription expiry ──────────────────────────────
    const now = new Date();
    let isExpired = false;

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

    // ─── Build token payload ─────────────────────────────────────
    // Ensure modules is an object (default to empty)
    const modules = company.modules || {};

    const token = jwt.sign(
      {
        id: company._id,
        email: company.email,
        name: company.companyName || company.name,
        type: 'company',
        companyName: company.companyName,
        companyId: company._id,
        modules: modules,
        managementType: company.managementType,
        subscriptionStatus: company.subscriptionStatus,
        expired: isExpired,
        trialEndsAt: company.trialEndsAt,
        currentPeriodEnd: company.currentPeriodEnd,
        // include other fields if needed (roles, assigned* etc.)
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // ─── Response ────────────────────────────────────────────────
    // Return full company data (without password)
    const companyData = company.toObject ? company.toObject() : company;
    delete companyData.password;

    return NextResponse.json({
      token,
      company: {
        ...companyData,
        expired: isExpired,
        subscriptionStatus: company.subscriptionStatus,
      },
    }, { status: 200 });

  } catch (err) {
    console.error('Company Login Error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}




// import { NextResponse } from 'next/server';
// import dbConnect from '@/lib/db';
// import Company from '@/models/Company';
// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
// import {jwtDecode} from 'jwt-decode';

// const JWT_SECRET = process.env.JWT_SECRET;

// export async function POST(req) {
//   try {
//     const body = await req.json();
//     const { email, password } = body;

//     if (!email || !password) {
//       return NextResponse.json({ message: 'Email and password required' }, { status: 400 });
//     }

//     await dbConnect();
//     const company = await Company.findOne({ email }).select("+password");

//     if (!company) {
//       return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
//     }

//     const isMatch = await bcrypt.compare(password, company.password);
//     if (!isMatch) {
//       return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
//     }

//     const token = jwt.sign(
//       {
//         id: company._id,
//         email: company.email,
//         name: company.name,
//         type: 'company',
//         modules: company.modules,
        
//         companyName: company.companyName,
//         companyId: company._id, 
//       },
//       JWT_SECRET,
//       { expiresIn: '7d' }
//     );

//     console.log(jwtDecode(token));
//         console.log(JSON.stringify(company.modules, null, 2));
//     return NextResponse.json({ token, company }, { status: 200 });

//   } catch (err) {
//     console.error('Company Login Error:', err);
//     return NextResponse.json({ message: 'Server error' }, { status: 500 });
//   }
// }
