import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import StockMovement from "@/models/StockMovement";
import Inventory from "@/models/Inventory";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import mongoose from "mongoose";
const { Types } = mongoose;

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  try {
    const user = await verifyJWT(token);
    if (!user) return { error: "Unauthorized", status: 403 };
    return { user };
  } catch {
    return { error: "Invalid token", status: 401 };
  }
}

export async function POST(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { adjustmentDate, adjustmentType, reason, remarks, items } = await req.json();
    if (!adjustmentDate || !adjustmentType || !items || items.length === 0) {
      return NextResponse.json({ success: false, message: "Required fields missing" }, { status: 400 });
    }

    for (const itemData of items) {
      const { item, warehouse, quantity, batchNumber, expiryDate, manufacturer, selectedBin } = itemData;

      if (!item || !warehouse || !quantity || quantity <= 0) {
        return NextResponse.json({ success: false, message: "Item, warehouse, and positive quantity required" }, { status: 400 });
      }

      const movementType = adjustmentType === "increase" ? "IN" : "OUT";
      const binId = selectedBin ? new Types.ObjectId(selectedBin) : null;

      // Find or create inventory per bin
      let inventory = await Inventory.findOne({
        item: new Types.ObjectId(item),
        warehouse: new Types.ObjectId(warehouse),
        bin: binId || { $in: [null, undefined] },
        companyId: user.companyId,
      });

      if (!inventory) {
        inventory = await Inventory.create({
          companyId: user.companyId,
          createdBy: user.id,
          warehouse: new Types.ObjectId(warehouse),
          item: new Types.ObjectId(item),
          bin: binId,
          quantity: adjustmentType === "increase" ? quantity : 0,
          committed: 0,
          onOrder: 0,
          batches: batchNumber
            ? [{ batchNumber, expiryDate: expiryDate ? new Date(expiryDate) : null, manufacturer: manufacturer || "", quantity }]
            : [],
        });
      } else {
        // Update quantity
        inventory.quantity = adjustmentType === "increase" ? inventory.quantity + quantity : Math.max(0, inventory.quantity - quantity);

        // Batch update
        if (batchNumber) {
          if (!Array.isArray(inventory.batches)) inventory.batches = [];
          const batch = inventory.batches.find(b => b.batchNumber === batchNumber);
          if (batch) {
            batch.quantity = adjustmentType === "increase" ? batch.quantity + quantity : Math.max(0, batch.quantity - quantity);
          } else {
            inventory.batches.push({ batchNumber, expiryDate: expiryDate ? new Date(expiryDate) : null, manufacturer: manufacturer || "", quantity });
          }
        }
      }

      await inventory.save();

      // Log stock movement
      await StockMovement.create({
        companyId: user.companyId,
        createdBy: user.id,
        item: new Types.ObjectId(item),
        warehouse: new Types.ObjectId(warehouse),
        bin: binId,
        movementType,
        quantity,
        reference: `ADJ-${Date.now()}`,
        remarks: `${adjustmentType.toUpperCase()} - ${reason || remarks || ""}`,
        date: adjustmentDate,
      });
    }

    return NextResponse.json({ success: true, message: "Inventory adjustment successful" }, { status: 201 });
  } catch (err) {
    console.error("POST /inventory-adjustments error:", err);
    return NextResponse.json({ success: false, message: "Failed to adjust inventory" }, { status: 500 });
  }
}





// import { NextResponse } from "next/server";
// import connectDb from "@/lib/db";
// import StockMovement from "@/models/StockMovement";
// import Inventory from "@/models/Inventory";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import ItemModels from "@/models/ItemModels";
// import warehouseModels from "@/models/warehouseModels";
// // ✅ Validate User
// async function validateUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Token missing", status: 401 };

//   try {
//     const user = await verifyJWT(token);
//     if (!user) return { error: "Unauthorized", status: 403 };
//     return { user };
//   } catch {
//     return { error: "Invalid token", status: 401 };
//   }
// }

// // ✅ POST - Create Inventory Adjustment
// export async function POST(req) {
//   await connectDb();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const { adjustmentDate, adjustmentType, reason, remarks, items } = await req.json();

//     if (!adjustmentDate || !adjustmentType || !items || items.length === 0) {
//       return NextResponse.json({ success: false, message: "Required fields missing" }, { status: 400 });
//     }

//     for (const itemData of items) {
//       const { item, warehouse, quantity, batchNumber, expiryDate, manufacturer } = itemData;

//       if (!item || !warehouse || !quantity) {
//         return NextResponse.json({ success: false, message: "Item, warehouse and quantity required" }, { status: 400 });
//       }

//       const movementType = adjustmentType === "increase" ? "IN" : "OUT";

//       // ✅ Log stock movement
//       await StockMovement.create({
//         companyId: user.companyId,
//         createdBy: user.id,
//         item,
//         warehouse,
//         movementType,
//         quantity,
//         reference: `ADJ-${Date.now()}`,
//         remarks,
//         date: adjustmentDate
//       });

//       // ✅ Update Inventory
//       const inventory = await Inventory.findOne({ item, warehouse });
//       if (inventory) {
//         if (adjustmentType === "increase") {
//           inventory.quantity += quantity;
//         } else {
//           inventory.quantity = Math.max(0, inventory.quantity - quantity);
//         }

//         // ✅ Batch update if batchNumber exists
//         if (batchNumber) {
//           const batch = inventory.batches.find(b => b.batchNumber === batchNumber);
//           if (batch) {
//             batch.quantity += quantity;
//           } else {
//             inventory.batches.push({ batchNumber, expiryDate, manufacturer, quantity });
//           }
//         }

//         await inventory.save();
//       } else {
//         await Inventory.create({
//           companyId: user.companyId,
//           createdBy: user.id,
//           warehouse,
//           item,
//           quantity: adjustmentType === "increase" ? quantity : 0,
//           batches: batchNumber ? [{ batchNumber, expiryDate, manufacturer, quantity }] : []
//         });
//       }
//     }

//     return NextResponse.json({ success: true, message: "Inventory adjustment successful" }, { status: 201 });
//   } catch (err) {
//     console.error("POST /inventory-adjustments error:", err);
//     return NextResponse.json({ success: false, message: "Failed to adjust inventory" }, { status: 500 });
//   }
// }

// ✅ GET - List Inventory Adjustments
export async function GET(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const url = new URL(req.url);
    const { page = 1, limit = 10, type = "" } = Object.fromEntries(url.searchParams);

    const query = { movementType: { $in: ["IN", "OUT"] }, companyId: user.companyId };
    if (type) query.movementType = type.toUpperCase();

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [adjustments, total] = await Promise.all([
      StockMovement.find(query)
        .populate("item", "itemName")
        .populate("warehouse", "warehouseName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      StockMovement.countDocuments(query)
    ]);

    return NextResponse.json({ success: true, data: adjustments, total }, { status: 200 });
  } catch (err) {
    console.error("GET /inventory-adjustments error:", err);
    return NextResponse.json({ success: false, message: "Failed to fetch adjustments" }, { status: 500 });
  }
}








// import { NextResponse } from "next/server";
// import connectDb from "@/lib/db";
// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// async function validateUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Token missing", status: 401 };

//   try {
//     const user = await verifyJWT(token);
//     if (!user) return { error: "Unauthorized", status: 403 };
//     return { user };
//   } catch (err) {
//     return { error: "Invalid token", status: 401 };
//   }
// }

// export async function POST(req) {
//   await connectDb();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const { adjustmentDate, adjustmentType, reason, remarks, items } = await req.json();

//     if (!adjustmentType || !Array.isArray(items) || items.length === 0) {
//       return NextResponse.json({ success: false, message: "Missing adjustment data" }, { status: 400 });
//     }

//     const movementType = adjustmentType === "increase" ? "IN" : "OUT";

//     const results = [];

//     for (const item of items) {
//       const { warehouse, item: itemId, quantity, batchNumber, expiryDate, manufacturer } = item;

//       if (!warehouse || !itemId || !quantity) {
//         return NextResponse.json({ success: false, message: "Item details incomplete" }, { status: 400 });
//       }

//       // ✅ Find existing inventory
//       let inventory = await Inventory.findOne({ item: itemId, warehouse });

//       if (!inventory) {
//         inventory = new Inventory({
//           companyId: user.companyId,
//           createdBy: user.id,
//           warehouse,
//           item: itemId,
//           quantity: 0,
//           batches: []
//         });
//       }

//       // ✅ Update quantity based on type
//       if (movementType === "IN") {
//         inventory.quantity += quantity;

//         if (batchNumber) {
//           const existingBatch = inventory.batches.find(b => b.batchNumber === batchNumber);
//           if (existingBatch) {
//             existingBatch.quantity += quantity;
//           } else {
//             inventory.batches.push({ batchNumber, expiryDate, manufacturer, quantity });
//           }
//         }
//       } else {
//         if (inventory.quantity < quantity) {
//           return NextResponse.json({ success: false, message: "Not enough stock" }, { status: 400 });
//         }
//         inventory.quantity -= quantity;
//       }

//       await inventory.save();

//       // ✅ Log stock movement
//       const movement = await StockMovement.create({
//         companyId: user.companyId,
//         createdBy: user.id,
//         item: itemId,
//         warehouse,
//         movementType,
//         quantity,
//         reference: `ADJUST-${Date.now()}`,
//         remarks,
//         date: adjustmentDate || new Date()
//       });

//       results.push({ inventory, movement });
//     }

//     return NextResponse.json({ success: true, message: "Inventory adjusted successfully", data: results }, { status: 201 });

//   } catch (err) {
//     console.error("Error:", err);
//     return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
//   }
// }

