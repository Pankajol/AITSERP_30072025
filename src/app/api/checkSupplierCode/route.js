// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Supplier from "@/models/SupplierModel";

// export async function GET(request) {
//   console.log("API Hit:", request.url);

//   await dbConnect();

//   try {
//     const { searchParams } = new URL(request.url);
//     const code = searchParams.get("code");

//     console.log("Received Code:", code);

//     if (!code) {
//       return NextResponse.json(
//         { success: false, error: "Supplier code required" },
//         { status: 400 }
//       );
//     }

//     const existingSupplier = await Supplier.findOne({ supplierCode: code });

//     console.log("Supplier Exists:", !!existingSupplier);

//     return NextResponse.json(
//       { success: true, exists: !!existingSupplier },
//       { status: 200 }
//     );

//   } catch (error) {
//     console.error("Check supplier code error:", error);
//     return NextResponse.json(
//       { success: false, error: "Server error" },
//       { status: 500 }
//     );
//   }
// }

  

// app/api/checkSupplierCode/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
// import Supplier from '@/models/SupplierModel';
import Supplier from '@/models/SupplierModels'

//export const runtime = "nodejs"; // Ensures full Node.js support in App Router

export async function GET(request) {
  try {
    // Ensure MongoDB connection
    const connected = await dbConnect();
    if (!connected) {
      return NextResponse.json(
        { success: false, error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Supplier code parameter is required" },
        { status: 400 }
      );
    }

    // Query database
    const existingSupplier = await Supplier.findOne({ supplierCode: code });

    return NextResponse.json(
      { success: true, exists: !!existingSupplier },
      { status: 200 }
    );

  } catch (error) {
    console.error("Check supplier code error:", error);
    return NextResponse.json(
      { success: false, error: "Server error checking supplier code" },
      { status: 500 }
    );
  }
}
