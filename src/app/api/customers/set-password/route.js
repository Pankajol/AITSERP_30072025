import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/CustomerModel";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    await dbConnect();

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Find document
    const customer = await Customer.findOne({
      $or: [{ emailId: normalizedEmail }, { "contactEmails.email": normalizedEmail }]
    });

    if (!customer) return NextResponse.json({ message: "User not found" }, { status: 404 });

    // 2. 🔥 Set Password for the correct user
    if (customer.emailId === normalizedEmail) {
      customer.password = hash;
    } else {
      const idx = customer.contactEmails.findIndex(c => c.email === normalizedEmail);
      if (idx !== -1) {
        customer.contactEmails[idx].password = hash;
      }
    }

    await customer.save();
    return NextResponse.json({ message: "Security credentials established! ✅" });
  } catch (err) {
    return NextResponse.json({ message: "Setup failed" }, { status: 500 });
  }
}


// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Customer from "@/models/CustomerModel";
// import bcrypt from "bcryptjs";

// export async function POST(req) {
//   try {
//     const { email, password } = await req.json();

//     await dbConnect();

//     const salt = await bcrypt.genSalt(10);
//     const hash = await bcrypt.hash(password, salt);

//     await Customer.findOneAndUpdate(
//       { emailId: email },
//       { password: hash }
//     );

//     return NextResponse.json({ message: "Password set" });
//   } catch (err) {
//     return NextResponse.json({ message: "Server error" }, { status: 500 });
//   }
// }
