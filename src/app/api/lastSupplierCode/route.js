import { NextResponse } from "next/server";
import Supplier from '@/models/SupplierModels';
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  try {
    // Step 1: Authenticate
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: Token missing" }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded || !decoded.companyId) {
      return NextResponse.json({ error: "Unauthorized: Invalid token or missing company ID" }, { status: 401 });
    }

    // Step 2: Connect to DB
    await connectDB();

    // Step 3: Find the supplier with the highest supplierCode for the company
    const lastSupplier = await Supplier.findOne({ companyId: decoded.companyId })
      .sort({ supplierCode: -1 })
      .limit(1);

    const lastSupplierCode = lastSupplier?.supplierCode || "SUPP-0000";

    return NextResponse.json({ lastSupplierCode });
  } catch (error) {
    console.error("Error in GET /api/lastSupplierCode:", error);
    return NextResponse.json(
      { error: "Failed to fetch last supplier code" },
      { status: 500 }
    );
  }
}





// import { NextResponse } from "next/server";
// import Supplier from '@/models/SupplierModels'; // Changed to Supplier model
// import connectDB from "@/lib/db";

// export async function GET() {
//   try {
//     await connectDB();

//     // Find the supplier with the highest code
//     const lastSupplier = await Supplier.findOne()
//       .sort({ supplierCode: -1 }) // Changed field to supplierCode
//       .limit(1);

//     // Default to "SUPP-0000" if no suppliers exist
//     const lastSupplierCode = lastSupplier?.supplierCode || "SUPP-0000"; // Changed variable names

//     return NextResponse.json({ lastSupplierCode }); // Changed response property name
//   } catch (error) {
//     return NextResponse.json(
//       { error: "Failed to fetch last supplier code" }, // Updated error message
//       { status: 500 }
//     );
//   }
// }