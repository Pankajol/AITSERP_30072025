import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

// 🔹 Middleware for authentication
async function authenticate(req) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { user: null, error: "Unauthorized: No token provided" };
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    return { user: decoded, error: null }; // decoded contains companyId
  } catch (err) {
    console.error("Auth error:", err);
    return { user: null, error: "Unauthorized: Invalid token" };
  }
}

// ========================= GET =========================
export async function GET(req) {
  try {
    // 🔹 Authenticate request
    const { user, error } = await authenticate(req);
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    // ✅ Fetch only logged-in user's company
    await dbConnect();
    const company = await Company.findById(user.companyId).select("-password");

    if (!company) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }

    return NextResponse.json(company, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: "Failed to fetch company" },
      { status: 500 }
    );
  }
}




// import dbConnect from '@/lib/db';
// import Company from '@/models/Company';
// import bcrypt from 'bcryptjs';
// import { NextResponse } from 'next/server';

// // ========================= POST =========================
// export async function GET() {
//   try {
//     await dbConnect();
//     const companies = await Company.find().select('-password');
//     return NextResponse.json(companies, { status: 200 });
//   } catch (e) {
//     console.error(e);
//     return NextResponse.json(
//       { message: 'Failed to fetch companies' },
//       { status: 500 }
//     );
//   } 
// }


// ========================= POST =========================

export async function POST(request) {
  try {
    const body = await request.json();

    await dbConnect();

    const hashedPassword = await bcrypt.hash(body.password, 10);
    const company = await Company.create({
      ...body,
      password: hashedPassword,
    });

    return NextResponse.json({ id: company._id }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { message: 'Registration failed' },
      { status: 400 }
    );
  }
}

// ========================= POST =========================
