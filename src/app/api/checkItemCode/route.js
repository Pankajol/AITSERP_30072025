import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db'; // MongoDB connection utility
import Item from '@/models/ItemModels'; // Assuming you have an Item model

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

    // Extract query parameters from the URL
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    // Check if the 'code' parameter is present
    if (!code) {
      return NextResponse.json(
        { success: false, error: "Item code parameter is required" },
        { status: 400 }
      );
    }

    // Query the database to find the item with the given code
    const existingItem = await Item.findOne({ itemCode: code });

    // Return a response indicating if the item code exists
    return NextResponse.json(
      { success: true, exists: !!existingItem },
      { status: 200 }
    );
  } catch (error) {
    console.error("Check item code error:", error);
    return NextResponse.json(
      { success: false, error: "Server error checking item code" },
      { status: 500 }
    );
  }
}




// import { NextResponse } from "next/server";
// import Item from '@/models/ItemModels'; // Assuming you have an Item model
// import connectDB from "@/lib/db"; // Your MongoDB connection utility

// export async function GET(req) {
//   // const { code } = req.nextUrl.searchParams; // Get the 'code' query parameter
//   const { searchParams } = new URL(request.url);
//   const code = searchParams.get('code');

//   if (!code) {
//     return NextResponse.json(
//       { error: "Item code is required" },
//       { status: 400 }
//     );
//   }

//   try {
//     await connectDB();

//     // Check if an item exists with the provided item code
//     const itemExists = await Item.findOne({ itemCode: code });

//     if (itemExists) {
//       return NextResponse.json(
//         { message: `Item code ${code} already exists` },
//         { status: 200 }
//       );
//     } else {
//       return NextResponse.json(
//         { message: `Item code ${code} is available` },
//         { status: 200 }
//       );
//     }
//   } catch (error) {
//     return NextResponse.json(
//       { error: "Failed to check item code" },
//       { status: 500 }
//     );
//   }
// }
