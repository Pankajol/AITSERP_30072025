import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ProductionOrder from "@/models/ProductionOrder";
import ReceiptProduction from "@/models/ReceiptProduction";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement"; // ✅ add this
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function POST(req, contextPromise) {
  try {
    await connectDB();

    const context = await contextPromise;
    const { params } = context;
    const { orderId } = params || {};

    if (!orderId) {
      return NextResponse.json({ message: "Missing orderId in route params" }, { status: 400 });
    }

    // ✅ Auth
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded) return NextResponse.json({ message: "Invalid token" }, { status: 403 });

    // ✅ Qty from query string
    const { qty } = Object.fromEntries(new URL(req.url).searchParams);
    const qtyParam = parseFloat(qty || "1");

    const body = await req.json();

    // ✅ Find order with BOM
    const order = await ProductionOrder.findById(orderId).populate("bomId");
    if (!order) return NextResponse.json({ message: "Production Order not found" }, { status: 404 });

    if (!order.bomId || !Array.isArray(order.bomId.items)) {
      return NextResponse.json({ message: "Invalid or missing BOM items" }, { status: 400 });
    }

    const sourceWarehouse = order?.warehouse || order?.bomId?.[0]?.warehouse;
    if (!sourceWarehouse) {
      return NextResponse.json(
        { error: "sourceWarehouse is required but not found in order or BOM" },
        { status: 400 }
      );
    }

    // ✅ Step 1: Create ReceiptProduction
    const receipt = await ReceiptProduction.create({
      ...body,
      productionOrder: orderId,
      createdBy: decoded.id,
      qty: qtyParam,
      sourceWarehouse,
    });

    // ✅ Step 2: Update Inventory + Stock Movements
    for (const bomItem of order.bomId.items) {
      const { item, quantity, warehouse } = bomItem;
      const totalQuantity = quantity * qtyParam;

      // Update inventory
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

      // Record stock movement
      await StockMovement.create({
        companyId: decoded.companyId, // ✅ comes from JWT
        createdBy: decoded.id,
        item,
        warehouse,
        movementType: "RECEIPT FROM PRODUCTION ORDER",
        quantity: totalQuantity,
        reference: receipt._id.toString(),
        remarks: `Receipt from Production Order ${orderId}`,
      });
    }

    // ✅ Step 3: Update Production Order qty
    await ProductionOrder.findByIdAndUpdate(orderId, {
      $inc: { reciptforproductionqty: qtyParam },
    });

    return NextResponse.json({ success: true, receipt }, { status: 201 });
  } catch (error) {
    console.error("Error in receipt-production:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



// import { NextResponse } from "next/server";
// import connectDB from "@/lib/db";
// import ProductionOrder from "@/models/ProductionOrder";
// import ReceiptProduction from "@/models/ReceiptProduction";
// import Inventory from "@/models/Inventory";
// import BOM from "@/models/BOM";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// export async function POST(req, contextPromise) {
//   try {
//     await connectDB();

//     const context = await contextPromise;
//     const { params } = context;
//     const { orderId } = params || {};

//     if (!orderId) {
//       return NextResponse.json({ message: 'Missing orderId in route params' }, { status: 400 });
//     }

//     const token = getTokenFromHeader(req);
//     if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

//     const decoded = verifyJWT(token);
//     if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 403 });

//     const { qty } = Object.fromEntries(new URL(req.url).searchParams);
//     const qtyParam = parseFloat(qty || "1");

//     const body = await req.json();

//     const order = await ProductionOrder.findById(orderId).populate("bomId");
//     if (!order) return NextResponse.json({ message: 'Production Order not found' }, { status: 404 });

//     if (!order.bomId || !Array.isArray(order.bomId.items)) {
//       return NextResponse.json({ message: 'Invalid or missing BOM items' }, { status: 400 });
//     }
    

//     const sourceWarehouse = order?.warehouse || order?.bomId?.[0]?.warehouse;

// if (!sourceWarehouse) {
//   return NextResponse.json(
//     { error: "sourceWarehouse is required but not found in order or BOM" },
//     { status: 400 }
//   );
// }

//     // Step 1: Create ReceiptProduction
//     const receipt = await ReceiptProduction.create({
//       ...body,
//       productionOrder: orderId,
//       createdBy: decoded.id,
//       qty: qtyParam,
//       sourceWarehouse,
//     });

//     // Step 2: Update Inventory for each BOM item
//     for (const bomItem of order.bomId.items) {
//       const { item, quantity, warehouse } = bomItem;
//       const totalQuantity = quantity * qtyParam;

//       const existingInventory = await Inventory.findOne({ item, warehouse });

//       if (existingInventory) {
//         existingInventory.quantity += totalQuantity;
//         await existingInventory.save();
//       } else {
//         await Inventory.create({
//           item,
//           warehouse,
//           quantity: totalQuantity,
//         });
//       }
//     }

//     await ProductionOrder.findByIdAndUpdate(
//       orderId,
//       { $inc: { reciptforproductionqty: qtyParam } }
//     );

//     return NextResponse.json({ success: true, receipt }, { status: 201 });

//   } catch (error) {
//     console.error("Error in receipt-production:", error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }





















