import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/CustomerModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });

    const decoded = await verifyJWT(token);
    // JWT contains 'id' of the customer document
    const customer = await Customer.findById(decoded.id);

    if (!customer) return NextResponse.json({ success: false, msg: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true, customer: customer.toObject() });
  } catch (err) {
    return NextResponse.json({ success: false, msg: "Server error" }, { status: 500 });
  }
}



// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Customer from "@/models/CustomerModel";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth"; // ✅ Added security imports

// export async function GET(req) {
//   try {
//     await dbConnect();

//     // 1. 🔥 SECURITY: Token nikaalein aur verify karein
//     const token = getTokenFromHeader(req);
//     if (!token) {
//       return NextResponse.json({ success: false, msg: "Unauthorized access" }, { status: 401 });
//     }

//     let decoded;
//     try {
//       decoded = await verifyJWT(token);
//     } catch (err) {
//       return NextResponse.json({ success: false, msg: "Invalid or expired token" }, { status: 403 });
//     }

//     // 2. Database se customer dhoondein (Using ID from decoded token)
//     // Hum token se 'id' le rahe hain taaki koi doosre ki ID pass karke data na nikaal sake
//     const customer = await Customer.findById(decoded.id);

//     if (!customer) {
//       return NextResponse.json({ success: false, msg: "Customer profile not found" }, { status: 404 });
//     }

//     // 3. Poora data return karein (including contactEmails, address, etc.)
//     return NextResponse.json({ 
//       success: true, 
//       customer: customer.toObject() 
//     });

//   } catch (err) {
//     console.error("Profile API Error:", err);
//     return NextResponse.json({ success: false, msg: "Server error", error: err.message }, { status: 500 });
//   }
// }