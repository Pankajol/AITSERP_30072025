
import { NextResponse } from "next/server";
import Item from "@/models/ItemModels";
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

    // Step 2: Connect to the database
    await connectDB();

    // Step 3: Find last item for this company
    const lastItem = await Item.findOne({ companyId: decoded.companyId })
      .sort({ itemCode: -1 })
      .limit(1);

    const lastItemCode = lastItem?.itemCode || "ITEM-0000";

    return NextResponse.json({ lastItemCode });
  } catch (error) {
    console.error("Error in GET /api/lastItemCode:", error);
    return NextResponse.json(
      { error: "Failed to fetch last item code" },
      { status: 500 }
    );
  }
}






// import { NextResponse } from "next/server";
// import Item from '@/models/ItemModels'; // Assuming you have an Item model
// import connectDB from "@/lib/db"; // Your MongoDB connection utility

// export async function GET() {
//   try {
//     await connectDB();

//     // Find the item with the highest item code
//     const lastItem = await Item.findOne()
//       .sort({ itemCode: -1 })
//       .limit(1);

//     // Default to "ITEM-0000" if no items exist
//     const lastItemCode = lastItem?.itemCode || "ITEM-000";

//     return NextResponse.json({ lastItemCode });
//   } catch (error) {
//     return NextResponse.json(
//       { error: "Failed to fetch last item code" },
//       { status: 500 }
//     );
//   }
// }
