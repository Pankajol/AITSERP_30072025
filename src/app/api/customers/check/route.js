import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/CustomerModel";

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ message: "Email required" }, { status: 400 });

    await dbConnect();
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Find the document
    const customer = await Customer.findOne({
      $or: [
        { emailId: normalizedEmail },
        { "contactEmails.email": normalizedEmail }
      ]
    }).select("+password +contactEmails.password"); // 🔥 Dono password select karein

    if (!customer) return NextResponse.json({ exists: false });

    let hasPassword = false;
    let displayName = customer.customerName;

    // 2. 🔥 Logic: Check individual password based on login email
    if (customer.emailId === normalizedEmail) {
      // Primary User
      hasPassword = !!customer.password;
    } else {
      // Sub-contact User
      const contact = customer.contactEmails.find(c => c.email === normalizedEmail);
      hasPassword = !!contact?.password;
      displayName = contact?.name || customer.customerName;
    }

    return NextResponse.json({
      exists: true,
      hasPassword: hasPassword, // Ab ye specific user ke liye accurate hai
      customerName: displayName 
    });
  } catch (err) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}



// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Customer from "@/models/CustomerModel";

// export async function POST(req) {
//   try {
//     const { email } = await req.json();

//     if (!email) {
//       return NextResponse.json({ message: "Email required" }, { status: 400 });
//     }

//     await dbConnect();

//     const customer = await Customer.findOne({
//       emailId: email.toLowerCase().trim(),
//     }).select("+password");

//     if (!customer) {
//       return NextResponse.json({ exists: false });
//     }

//     return NextResponse.json({
//       exists: true,
//       hasPassword: !!customer.password, // 🔥 main logic
//     });
//   } catch (err) {
//     return NextResponse.json({ message: "Server error" }, { status: 500 });
//   }
// }
