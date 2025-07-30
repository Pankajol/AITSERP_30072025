import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ProductionOrder from "@/models/ProductionOrder";
import ReceiptProduction from "@/models/ReceiptProduction";
import Inventory from "@/models/Inventory";
import BOM from "@/models/BOM";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function POST(req, contextPromise) {
  try {
    await connectDB();

    const context = await contextPromise;
    const { params } = context;
    const { orderId } = params || {};

    if (!orderId) {
      return NextResponse.json({ message: 'Missing orderId in route params' }, { status: 400 });
    }

    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 403 });

    const { qty } = Object.fromEntries(new URL(req.url).searchParams);
    const qtyParam = parseFloat(qty || "1");

    const body = await req.json();

    const order = await ProductionOrder.findById(orderId).populate("bomId");
    if (!order) return NextResponse.json({ message: 'Production Order not found' }, { status: 404 });

    if (!order.bomId || !Array.isArray(order.bomId.items)) {
      return NextResponse.json({ message: 'Invalid or missing BOM items' }, { status: 400 });
    }
    

    const sourceWarehouse = order?.warehouse || order?.bomId?.[0]?.warehouse;

if (!sourceWarehouse) {
  return NextResponse.json(
    { error: "sourceWarehouse is required but not found in order or BOM" },
    { status: 400 }
  );
}

    // Step 1: Create ReceiptProduction
    const receipt = await ReceiptProduction.create({
      ...body,
      productionOrder: orderId,
      createdBy: decoded.id,
      qty: qtyParam,
      sourceWarehouse,
    });

    // Step 2: Update Inventory for each BOM item
    for (const bomItem of order.bomId.items) {
      const { item, quantity, warehouse } = bomItem;
      const totalQuantity = quantity * qtyParam;

      const existingInventory = await Inventory.findOne({ item, warehouse });

      if (existingInventory) {
        existingInventory.quantity += totalQuantity;
        await existingInventory.save();
      } else {
        await Inventory.create({
          item,
          warehouse,
          quantity: totalQuantity,
        });
      }
    }

    await ProductionOrder.findByIdAndUpdate(
      orderId,
      { $inc: { reciptforproductionqty: qtyParam } }
    );

    return NextResponse.json({ success: true, receipt }, { status: 201 });

  } catch (error) {
    console.error("Error in receipt-production:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}




// import { NextResponse } from 'next/server';
// import mongoose from 'mongoose';
// import connectDB from '@/lib/db';
// import Inventory from '@/models/Inventory';
// import ReceiptProduction from '@/models/ReceiptProduction';
// import ProductionOrder from '@/models/ProductionOrder';

// export async function  POST(req, contextPromise) {
//   try {
  
//   const context = await contextPromise;
//   const { params } = context;
//   const { orderId } = params || {};
//     if (!orderId) {
//       return NextResponse.json(
//         { success: false, message: 'Missing orderId in URL' },
//         { status: 400 }
//       );
//     }

//     // Optional qty query‑param for how much to credit
//     const url = new URL(req.url);
//     const qtyParam = parseFloat(url.searchParams.get('qty') || '0');

//     // Body must be an array of batch entries
//     const entries = await req.json();
//     if (!Array.isArray(entries) || entries.length === 0) {
//       return NextResponse.json(
//         { success: false, message: 'Request body must be a non-empty array' },
//         { status: 400 }
//       );
//     }

//     // Process each batch entry
//     for (const entry of entries) {
//       const {
//         itemId,
//         productNo,
//         productDesc,
//         sourceWarehouse,
//         docNo,
//         docDate,
//         batches = [],
//       } = entry;

//       // Basic validation
//       if (!itemId || !sourceWarehouse || !batches.length) {
//         return NextResponse.json(
//           { success: false, message: 'Each entry needs itemId, sourceWarehouse, and at least one batch' },
//           { status: 400 }
//         );
//       }

//       // Correct ObjectId assignment
//         await connectDB();
// const itemObjId = new mongoose.Types.ObjectId(itemId);
// const warehouseObjId = new mongoose.Types.ObjectId(sourceWarehouse);

// // Find or create inventory
// let inventory = await Inventory.findOne({
//   item: itemObjId,
//   warehouse: warehouseObjId,
// });

// if (!inventory) {
//   inventory = new Inventory({
//     item: itemObjId,            // ✅ correctly referencing Item
//     warehouse: warehouseObjId,
//     productNo,
//     productDesc,
//     quantity: 0,
//     committed: 0,
//     onOrder: 0,
//     unitPrice: 0,
//     batches: [],
//   });
// } else {
//   inventory.productNo = inventory.productNo || productNo;
//   inventory.productDesc = inventory.productDesc || productDesc;
// }

//       // Sum up total new quantity from batches
//       let totalBatchQty = 0;
//       for (const b of batches) {
//         const { batchNumber, quantity, expiryDate, manufacturer, unitPrice } = b;
//         if (!batchNumber || quantity == null) {
//           return NextResponse.json(
//             { success: false, message: 'Each batch must have batchNumber and quantity' },
//             { status: 400 }
//           );
//         }
//         totalBatchQty += quantity;

//         const existing = inventory.batches.find(x => x.batchNumber === batchNumber);
//         if (existing) {
//           existing.quantity += quantity;
//           existing.expiryDate = expiryDate || existing.expiryDate;
//           existing.manufacturer = manufacturer || existing.manufacturer;
//           existing.unitPrice = unitPrice != null ? unitPrice : existing.unitPrice;
//         } else {
//           inventory.batches.push({ batchNumber, quantity, expiryDate, manufacturer, unitPrice });
//         }
//       }

//       // Update inventory totals
//       inventory.quantity += totalBatchQty;
//       await inventory.save();

//       // Record the receipt
//       await ReceiptProduction.create({
//         productionOrder: new mongoose.Types.ObjectId(orderId),
//         item: itemObjId,
//         sourceWarehouse: warehouseObjId,
//         docNo: docNo || '',
//         docDate: docDate ? new Date(docDate) : new Date(),
//         quantity: totalBatchQty,
//         unitPrice: batches[0]?.unitPrice || 0,
//         totalPrice: totalBatchQty * (batches[0]?.unitPrice || 0),
//         batches,
//         qtyParam
//       });
//     }

//     // --- NEW STEP: update the ProductionOrder's received‑for‑production qty
//     await ProductionOrder.findByIdAndUpdate(
//       orderId,
//       { $inc: { reciptforproductionqty: qtyParam } }
//     );

//     return NextResponse.json(
//       { success: true, message: 'Receipt created, inventory updated, production order incremented.' },
//       { status: 201 }
//     );
//   } catch (err) {
//     console.error('ReceiptProduction POST Error:', err);
//     return NextResponse.json(
//       { success: false, message: err.message },
//       { status: 500 }
//     );
//   }
// }





















