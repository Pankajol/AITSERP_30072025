// app/api/checkCustomerCode/route.js
import { NextResponse } from "next/server";
import Customer from '@/models/CustomerModel';
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { ex } from "@fullcalendar/core/internal-common";


export async function GET(request) {
  try {
    await connectDB();
    const token = getTokenFromHeader(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    } 
    const user = verifyJWT(token);
    if (!user || !user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Missing code parameter" },
        { status: 400 }
      );
    }

    const existingCustomer = await Customer.findOne({ customerCode: code, companyId: user.companyId });
    return NextResponse.json({ exists: !!existingCustomer });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check customer code" },
      { status: 500 }
    );
  }
}



// export async function GET(request) {
//   try {
//     await connectDB();
//     const { searchParams } = new URL(request.url);
//     const code = searchParams.get("code");

//     if (!code) {
//       return NextResponse.json(
//         { error: "Missing code parameter" },
//         { status: 400 }
//       );
//     }

//     const existingCustomer = await Customer.findOne({ customerCode: code });
//     return NextResponse.json({ exists: !!existingCustomer });
//   } catch (error) {
//     return NextResponse.json(
//       { error: "Failed to check customer code" },
//       { status: 500 }
//     );
//   }
// }