// import dbConnect from '@/lib/db';
// import Inventory from '@/models/Inventory';
// import '@/models/warehouseModels';  // Register the Warehouse model
// import '@/models/ItemModels';       // Register the Item model

// export async function GET(req, { params }) {
//   await dbConnect();
//   const { id } = params;
//   try {
//     const inventory = await Inventory.findOne({ _id: id })
//       .populate('warehouse')
//       .populate('item')
//       .lean();

//     if (!inventory) {
//       return new Response(
//         JSON.stringify({ success: false, message: "Inventory not found" }),
//         { status: 404, headers: { "Content-Type": "application/json" } }
//       );
//     }

//     return new Response(
//       JSON.stringify({ success: true, data: inventory }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     console.error("Error fetching inventory record:", error);
//     return new Response(
//       JSON.stringify({ success: false, message: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }




// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Inventory from "@/models/Inventory";

// export async function GET(req, { params }) {
//   await dbConnect();

//   const { itemCode, warehouseId } = params;

//   try {
//     const inventory = await Inventory.findOne({
//       item: itemCode,
//       warehouse: warehouseId,
//     });

//     if (!inventory) {
//       return NextResponse.json({ message: "Inventory not found" }, { status: 404 });
//     }

//     return NextResponse.json(inventory, { status: 200 });
//   } catch (error) {
//     return NextResponse.json({ message: "Server error", error }, { status: 500 });
//   }
// }


// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Inventory from "@/models/Inventory";
// import Item from "@/models/ItemModels";

// export async function GET(req, { params }) {
//   await dbConnect();

//   try {
//     const { itemCode, warehouseId } = params;

//     if (!itemCode || !warehouseId) {
//       return NextResponse.json(
//         { success: false, message: "Item code and warehouse ID are required" },
//         { status: 400 }
//       );
//     }

//     // ✅ Find Item by itemCode
//     const item = await Item.findOne({ itemCode }).select("_id");
//     if (!item) {
//       return NextResponse.json(
//         { success: false, message: `Item with code ${itemCode} not found` },
//         { status: 404 }
//       );
//     }

//     // ✅ Find Inventory by itemId and warehouseId
//     const inventory = await Inventory.findOne({
//       item: item._id,
//       warehouse: warehouseId,
//     });

//     if (!inventory) {
//       return NextResponse.json(
//         { success: false, message: "Inventory not found" },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json({ success: true, data: inventory }, { status: 200 });
//   } catch (error) {
//     console.error("Error fetching inventory:", error);
//     return NextResponse.json(
//       { success: false, message: "Server error", error: error.message },
//       { status: 500 }
//     );
//   }
// }



import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Inventory from "@/models/Inventory";
import Item from "@/models/ItemModels";
import { Types } from "mongoose";

export async function GET(req, { params }) {
  await dbConnect();

  try {
    const { itemCode, warehouseId } = params;

    // ✅ Validate params
    if (!itemCode || !warehouseId) {
      return NextResponse.json(
        { success: false, message: "Item code and warehouse ID are required" },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(warehouseId)) {
      return NextResponse.json(
        { success: false, message: "Invalid warehouse ID format" },
        { status: 400 }
      );
    }

    // ✅ Find Item by itemCode
    const item = await Item.findOne({ itemCode }).select("_id");
    if (!item) {
      return NextResponse.json(
        { success: false, message: `Item with code ${itemCode} not found` },
        { status: 404 }
      );
    }

    // ✅ Find Inventory
    const inventory = await Inventory.findOne({
      item: item._id,
      warehouse: warehouseId,
    }).select("quantity committed onOrder batches");

    if (!inventory) {
      return NextResponse.json(
        { success: false, message: "Inventory not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: inventory },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error fetching inventory:", error);
    return NextResponse.json(
      { success: false, message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}
