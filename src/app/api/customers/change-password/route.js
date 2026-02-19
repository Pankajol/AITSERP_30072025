import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/CustomerModel";
import bcrypt from "bcryptjs";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function POST(req) {
  try {
    await dbConnect();
    const { email, currentPassword, newPassword } = await req.json();

    // 1. Verify User (Security Check)
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // 2. Database se user dhoondo (Primary ya Contact)
    const customer = await Customer.findOne({
      $or: [{ emailId: email }, { "contactEmails.email": email }]
    }).select("+password +contactEmails.password");

    if (!customer) return NextResponse.json({ message: "User not found" }, { status: 404 });

    // 3. Check kaunsa user hai aur uska current password verify karo
    let userToUpdate = null;
    let isPrimary = customer.emailId === email;

    if (isPrimary) {
      const isMatch = await bcrypt.compare(currentPassword, customer.password);
      if (!isMatch) return NextResponse.json({ message: "Invalid current password" }, { status: 400 });
      userToUpdate = customer;
    } else {
      const contact = customer.contactEmails.find(c => c.email === email);
      const isMatch = await bcrypt.compare(currentPassword, contact.password);
      if (!isMatch) return NextResponse.json({ message: "Invalid current password" }, { status: 400 });
      userToUpdate = contact;
    }

    // 4. Hash naya password aur save karo
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    if (isPrimary) {
      customer.password = hashedPassword;
    } else {
      // Manual array update taaki Mongoose change detect kare
      const idx = customer.contactEmails.findIndex(c => c.email === email);
      customer.contactEmails[idx].password = hashedPassword;
    }

    await customer.save();
    return NextResponse.json({ success: true, message: "Vault Key Updated! 🔐" });

  } catch (err) {
    console.error("Vault Error:", err);
    return NextResponse.json({ message: "Server error", error: err.message }, { status: 500 });
  }
}


// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Customer from "@/models/CustomerModel";
// import bcrypt from "bcryptjs";

// export async function POST(req) {
//   try {
//     const { email, currentPassword, newPassword } = await req.json();

//     if (!email || !currentPassword || !newPassword) {
//       return NextResponse.json({ message: "All fields are required" }, { status: 400 });
//     }

//     await dbConnect();

//     // 1. Find Customer (Check Primary OR Contact Emails)
//     const customer = await Customer.findOne({
//       $or: [
//         { emailId: email.toLowerCase().trim() },
//         { "contactEmails.email": email.toLowerCase().trim() }
//       ]
//     }).select("+password");

//     if (!customer) {
//       return NextResponse.json({ message: "Customer not found" }, { status: 404 });
//     }

//     // 2. Verify Current Password
//     const isMatch = await bcrypt.compare(currentPassword, customer.password);
//     if (!isMatch) {
//       return NextResponse.json({ message: "Current password is incorrect" }, { status: 401 });
//     }

//     // 3. Hash New Password
//     const salt = await bcrypt.genSalt(10);
//     const hashedNewPassword = await bcrypt.hash(newPassword, salt);

//     // 4. Update and Save
//     customer.password = hashedNewPassword;
//     await customer.save();

//     return NextResponse.json({ message: "Password updated successfully! 🔐" });
//   } catch (err) {
//     console.error("Change Password Error:", err);
//     return NextResponse.json({ message: "Internal server error" }, { status: 500 });
//   }
// }