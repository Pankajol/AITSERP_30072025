import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// 🔹 Middleware for authentication
async function authenticate(req) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { user: null, error: "Unauthorized: No token provided" };
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    return { user: decoded, error: null }; // decoded should contain companyId
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

// ========================= POST (signup) =========================
export async function POST(request) {
  try {
    const body = await request.json();

    // basic validation
    if (!body.email || !body.password || !body.contactName) {
      return NextResponse.json(
        { message: "contactName, email and password are required" },
        { status: 400 }
      );
    }

    if (typeof body.password !== "string" || body.password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    await dbConnect();

    // prevent duplicate registrations (by email)
    const existing = await Company.findOne({ email: body.email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { message: "A company with this email already exists" },
        { status: 409 }
      );
    }

    // hash password using bcryptjs
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(body.password, saltRounds);

    const company = await Company.create({
      ...body,
      email: body.email.toLowerCase(),
      password: hashedPassword,
    });

    return NextResponse.json({ id: company._id }, { status: 201 });
  } catch (e) {
    console.error("Signup error:", e);
    return NextResponse.json(
      { message: "Registration failed", error: e.message },
      { status: 400 }
    );
  }
}



// import dbConnect from "@/lib/db";
// import Company from "@/models/Company";
// import { NextResponse } from "next/server";
// import jwt from "jsonwebtoken";

// // 🔹 Middleware for authentication
// async function authenticate(req) {
//   try {
//     const authHeader = req.headers.get("authorization");

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return { user: null, error: "Unauthorized: No token provided" };
//     }

//     const token = authHeader.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     return { user: decoded, error: null }; // decoded contains companyId
//   } catch (err) {
//     console.error("Auth error:", err);
//     return { user: null, error: "Unauthorized: Invalid token" };
//   }
// }

// // ========================= GET =========================
// export async function GET(req) {
//   try {
//     // 🔹 Authenticate request
//     const { user, error } = await authenticate(req);
//     if (error) {
//       return NextResponse.json({ message: error }, { status: 401 });
//     }

//     // ✅ Fetch only logged-in user's company
//     await dbConnect();
//     const company = await Company.findById(user.companyId).select("-password");

//     if (!company) {
//       return NextResponse.json({ message: "Company not found" }, { status: 404 });
//     }

//     return NextResponse.json(company, { status: 200 });
//   } catch (e) {
//     console.error(e);
//     return NextResponse.json(
//       { message: "Failed to fetch company" },
//       { status: 500 }
//     );
//   }
// }






// // ========================= POST =========================

// export async function POST(request) {
//   try {
//     const body = await request.json();

//     await dbConnect();

//     const hashedPassword = await bcrypt.hash(body.password, 10);
//     const company = await Company.create({
//       ...body,
//       password: hashedPassword,
//     });

//     return NextResponse.json({ id: company._id }, { status: 201 });
//   } catch (e) {
//     console.error(e);
//     return NextResponse.json(
//       { message: 'Registration failed' },
//       { status: 400 }
//     );
//   }
// }

// // ========================= POST =========================
