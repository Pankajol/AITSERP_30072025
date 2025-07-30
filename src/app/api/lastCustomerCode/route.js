import { NextResponse } from "next/server";
import Customer from '@/models/CustomerModel';
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: Token missing" }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.companyId) {
      return NextResponse.json({ error: "Unauthorized or company ID missing in token" }, { status: 401 });
    }

    await connectDB();

    // Filter by companyId from token
    const lastCustomer = await Customer.findOne({ companyId: decoded.companyId })
      .sort({ customerCode: -1 })
      .limit(1);

    const lastCustomerCode = lastCustomer?.customerCode || "CUST-0000";

    return NextResponse.json({ lastCustomerCode });
  } catch (error) {
    console.error("Error fetching last customer code:", error);
    return NextResponse.json(
      { error: "Failed to fetch last customer code" },
      { status: 500 }
    );
  }
}







// app/api/lastCustomerCode/route.js
// import { NextResponse } from "next/server";
// import Customer from '@/models/CustomerModel';
// import connectDB from "@/lib/db"; // Your MongoDB connection utility

// export async function GET() {
//   try {
//     await connectDB();

//     // Find the customer with the highest code
//     const lastCustomer = await Customer.findOne()
//       .sort({ customerCode: -1 })
//       .limit(1);

//     // Default to "CUST-0000" if no customers exist
//     const lastCustomerCode = lastCustomer?.customerCode || "CUST-0000";

//     return NextResponse.json({ lastCustomerCode });
//   } catch (error) {
//     return NextResponse.json(
//       { error: "Failed to fetch last customer code" },
//       { status: 500 }
//     );
//   }
// }