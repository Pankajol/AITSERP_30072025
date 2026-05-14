import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/CustomerModel";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ message: "Credentials missing" }, { status: 400 });

    await dbConnect();
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Find Customer document containing this email
    const customer = await Customer.findOne({
      $or: [ { emailId: normalizedEmail }, { "contactEmails.email": normalizedEmail } ]
    }).select("+password +contactEmails.password");

    if (!customer) return NextResponse.json({ message: "Identity not recognized" }, { status: 401 });

    let isMatch = false;
    let loginData = null;

    // 2. 🔥 100x LOGIC: Check which password to verify
    if (customer.emailId === normalizedEmail) {
      // Primary login
      isMatch = await bcrypt.compare(password, customer.password);
      loginData = { id: customer._id, name: customer.customerName };
    } else {
      // Sub-contact login
      const contact = customer.contactEmails.find(c => c.email === normalizedEmail);
      if (contact && contact.password) {
        isMatch = await bcrypt.compare(password, contact.password);
        loginData = { id: customer._id, contactId: contact._id, name: contact.name };
      }
    }

    if (!isMatch) return NextResponse.json({ message: "Invalid access key" }, { status: 401 });

    // 3. Generate Token with metadata
    const token = jwt.sign(
      { 
        id: loginData.id, 
        contactId: loginData.contactId || null,
        email: normalizedEmail, 
        companyId: customer.companyId,
        type: "customer" 
      },
      SECRET, { expiresIn: "1d" }
    );

    return NextResponse.json({
      token,
      customer: {
        id: customer._id,
        name: loginData.name,
        email: normalizedEmail,
        customerType: customer.customerType,
        companyId: customer.companyId
      }
    });

  } catch (err) {
    return NextResponse.json({ message: "Authentication Engine Error" }, { status: 500 });
  }
}

// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Customer from "@/models/CustomerModel";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";

// const SECRET = process.env.JWT_SECRET;

// export async function POST(req) {
//   try {
//     const { email, password } = await req.json();

//     // ✅ Validate input
//     if (!email || !password) {
//       return NextResponse.json(
//         { message: "Email and password are required" },
//         { status: 400 }
//       );
//     }

//     await dbConnect();

//     // ✅ Find customer (password hidden by default so select)
//     const customer = await Customer.findOne({
//       emailId: email.toLowerCase().trim(),
//     }).select("+password");

//     if (!customer) {
//       return NextResponse.json(
//         { message: "Invalid credentials" },
//         { status: 401 }
//       );
//     }

//     // ✅ Optional portal access check
//     if (customer.portalAccess === false) {
//       return NextResponse.json(
//         { message: "Portal access disabled" },
//         { status: 403 }
//       );
//     }

//     // ✅ Password check
//     const isMatch = await bcrypt.compare(password, customer.password);
//     if (!isMatch) {
//       return NextResponse.json(
//         { message: "Invalid credentials" },
//         { status: 401 }
//       );
//     }

//     // ✅ Generate JWT (customer type)
//     const token = jwt.sign(
//       {
//         id: customer._id,
//         companyId: customer.companyId,
//         email: customer.emailId,
//         type: "customer", // 🔥 important for middleware
//       },
//       SECRET,
//       { expiresIn: "1d" }
//     );

//     // ✅ Remove sensitive fields
//     const { password: _, __v, ...safeCustomer } = customer.toObject();

//     return NextResponse.json({
//       token,
//       customer: safeCustomer,
//     });
//   } catch (error) {
//     console.error("Customer Login Error:", error);
//     return NextResponse.json(
//       { message: "Server error" },
//       { status: 500 }
//     );
//   }
// }
