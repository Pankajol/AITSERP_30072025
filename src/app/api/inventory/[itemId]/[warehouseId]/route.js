



// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Inventory from "@/models/Inventory";
// import { Types } from "mongoose";

// export async function GET(req, { params }) {
//   await dbConnect();

//   try {
//     const { itemId, warehouseId } = params;

//     // ✅ Validate IDs
//     if (!Types.ObjectId.isValid(itemId) || !Types.ObjectId.isValid(warehouseId)) {
//       return NextResponse.json(
//         { success: false, message: "Invalid itemId or warehouseId" },
//         { status: 400 }
//       );
//     }

//     // ✅ Find Inventory
//     const inventory = await Inventory.findOne({
//       item: new Types.ObjectId(itemId),
//       warehouse: new Types.ObjectId(warehouseId),
//     }).lean();

//     if (!inventory) {
//       return NextResponse.json(
//         { success: false, message: "Inventory not found" },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json(
//       { success: true, batches: inventory.batches || [] },
//       { status: 200 }
//     );
//   } catch (error) {
//     console.error("❌ Error fetching inventory:", error);
//     return NextResponse.json(
//       { success: false, message: "Internal Server Error", error: error.message },
//       { status: 500 }
//     );
//   }
// }






import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Inventory from "@/models/Inventory";
import { Types } from "mongoose";

export async function GET(req, { params }) {
  await dbConnect();

  try {
    const { itemId, warehouseId } = params;

    // ✅ Validate IDs
    if (!Types.ObjectId.isValid(itemId) || !Types.ObjectId.isValid(warehouseId)) {
      return NextResponse.json(
        { success: false, message: "Invalid itemId or warehouseId" },
        { status: 400 }
      );
    }

    // ✅ Find Inventory
    const inventory = await Inventory.findOne({
      item: new Types.ObjectId(itemId),
      warehouse: new Types.ObjectId(warehouseId),
    }).lean();

    if (!inventory) {
      return NextResponse.json(
        { success: false, message: "Inventory record not found for this item and warehouse" },
        { status: 404 }
      );
    }

    // ✅ Return batch array (or variant inventory if needed)
    // If the item has variants, you may want to return variantInventory instead.
    // Here we return both batches and variantInventory for completeness.
    return NextResponse.json(
      {
        success: true,
        batches: inventory.batches || [],
        variantInventory: inventory.variantInventory || [],
        hasVariants: inventory.hasVariants || false,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error fetching inventory:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}