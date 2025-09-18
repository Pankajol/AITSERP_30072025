import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import IssueProduction from '@/models/IssueProduction';
import ProductionOrder from '@/models/ProductionOrder';
import Inventory from '@/models/Inventory';
import StockMovement from '@/models/StockMovement'; // ✅ Added
import { verifyJWT } from '@/lib/auth';

export async function POST(req, context) {
  try {
    await connectDB();

    // 🔐 Extract token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let user;
    try {
      user = verifyJWT(token);
    } catch {
      return NextResponse.json({ message: 'Invalid or expired token' }, { status: 401 });
    }

    const { companyId, userId } = user;

    // 1️⃣ Validate route param
    const { productionOrderId } = context.params || {};
    if (!productionOrderId) {
      return NextResponse.json({ message: 'Missing productionOrderId in URL' }, { status: 400 });
    }

    // 2️⃣ Parse request
    const { searchParams } = new URL(req.url);
    const qtyParam = Number(searchParams.get('qty')) || 0;
    const body = await req.json();
    const { avgCostPrice, data } = body;

    if (avgCostPrice == null) {
      return NextResponse.json({ message: 'Missing avgCostPrice in request body' }, { status: 400 });
    }
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ message: '`data` must be a non-empty array' }, { status: 400 });
    }

    const createdRecords = [];
    for (const entry of data) {
      const {
        itemId,
        sourceWarehouse,
        destinationWarehouse,
        batchNumber,
        quantity,
        expiryDate,
        manufacturer,
        unitPrice,
        managedByBatch,
      } = entry;

      // 3️⃣ Validation
      if (!itemId || !sourceWarehouse || !quantity || quantity <= 0) {
        return NextResponse.json(
          { message: 'Each entry needs itemId, sourceWarehouse, and positive quantity' },
          { status: 400 }
        );
      }
      if (managedByBatch && !batchNumber) {
        return NextResponse.json({ message: 'batchNumber required for batch-managed items' }, { status: 400 });
      }

      // 4️⃣ Fetch & update inventory
      const inventory = await Inventory.findOne({ item: itemId, warehouse: sourceWarehouse, companyId });
      if (!inventory) {
        return NextResponse.json(
          { message: `No inventory for item ${itemId} in warehouse ${sourceWarehouse}` },
          { status: 404 }
        );
      }

      if (managedByBatch) {
        const batch = inventory.batches.find(b => b.batchNumber === batchNumber);
        if (!batch) {
          return NextResponse.json({ message: `Batch ${batchNumber} not found in inventory` }, { status: 404 });
        }
        if (batch.quantity < quantity) {
          return NextResponse.json(
            { message: `Insufficient in batch ${batchNumber}: have ${batch.quantity}, need ${quantity}` },
            { status: 400 }
          );
        }
        batch.quantity -= quantity;
      }

      inventory.quantity = Math.max(0, inventory.quantity - quantity);
      await inventory.save();

      // 5️⃣ Prepare IssueProduction record
      createdRecords.push({
        productionOrderId,
        itemId,
        sourceWarehouse,
        destinationWarehouse: destinationWarehouse || '',
        batchNumber: managedByBatch ? batchNumber : '',
        quantity,
        expiryDate: expiryDate || null,
        manufacturer: manufacturer || null,
        unitPrice: unitPrice || 0,
        qtyParam,
        managedByBatch,
        companyId,
        createdBy: userId,
      });

      // 6️⃣ Record Stock Movement (OUT)
      await StockMovement.create({
        companyId,
        createdBy: userId,
        item: itemId,
        warehouse: sourceWarehouse,
        movementType: 'STOCK_ISSUE', // ✅ issuing to production
        quantity,
        reference: productionOrderId,
        remarks: `Issued for Production Order ${productionOrderId}`,
      });
    }

    // 7️⃣ Bulk insert IssueProduction
    const result = await IssueProduction.insertMany(createdRecords);

    // 8️⃣ Update Production Order
    await ProductionOrder.findOneAndUpdate(
      { _id: productionOrderId, companyId },
      {
        $inc: { issuforproductionqty: qtyParam },
        $set: { rate: avgCostPrice },
      }
    );

    return NextResponse.json({ message: 'Issued successfully', data: result }, { status: 201 });
  } catch (err) {
    console.error('IssueProduction POST Error:', err);
    return NextResponse.json({ message: 'Internal Server Error', error: err.message }, { status: 500 });
  }
}




// import { NextResponse } from 'next/server';
// import connectDB from '@/lib/db';
// import IssueProduction from '@/models/IssueProduction';
// import ProductionOrder from '@/models/ProductionOrder';
// import Inventory from '@/models/Inventory';
// import { verifyJWT } from '@/lib/auth'; // Import your JWT verification helper

// export async function POST(req, context) {
//   try {
//     await connectDB();

//     // 🔐 Extract token from headers
//     const authHeader = req.headers.get('authorization');
//     if (!authHeader || !authHeader.startsWith('Bearer ')) {
//       return NextResponse.json({ message: 'Unauthorized: Missing token' }, { status: 401 });
//     }

//     const token = authHeader.split(' ')[1];
//     let user;
//     try {
//       user = verifyJWT(token); // Will throw if invalid
//     } catch (err) {
//       return NextResponse.json({ message: 'Invalid or expired token' }, { status: 401 });
//     }

//     const { companyId, userId } = user; // Use this if needed

//     // 1️⃣ Extract and validate the dynamic route param
//     const { productionOrderId } = context.params || {};
//     if (!productionOrderId) {
//       return NextResponse.json(
//         { message: 'Missing productionOrderId in URL' },
//         { status: 400 }
//       );
//     }

//     // 2️⃣ Parse query and body
//     const { searchParams } = new URL(req.url);
//     const qtyParam = Number(searchParams.get('qty')) || 0;
//     const body = await req.json();
//     const { avgCostPrice, data } = body;

//     // 3️⃣ Validate body
//     if (avgCostPrice == null) {
//       return NextResponse.json(
//         { message: 'Missing avgCostPrice in request body' },
//         { status: 400 }
//       );
//     }
//     if (!Array.isArray(data) || data.length === 0) {
//       return NextResponse.json(
//         { message: '`data` must be a non‑empty array' },
//         { status: 400 }
//       );
//     }

//     // 4️⃣ For each line item: validate and prepare updates
//     const createdRecords = [];
//     for (const entry of data) {
//       const {
//         itemId,
//         sourceWarehouse,
//         destinationWarehouse,
//         batchNumber,
//         quantity,
//         expiryDate,
//         manufacturer,
//         unitPrice,
//         managedByBatch,
//       } = entry;

//       // 4a. Basic field checks
//       if (!itemId || !sourceWarehouse || !quantity || quantity <= 0) {
//         return NextResponse.json(
//           { message: 'Each entry needs itemId, sourceWarehouse, and positive quantity' },
//           { status: 400 }
//         );
//       }
//       // 4b. Batch‑managed checks
//       if (managedByBatch && !batchNumber) {
//         return NextResponse.json(
//           { message: 'batchNumber required for batch‑managed items' },
//           { status: 400 }
//         );
//       }

//       // 5️⃣ Fetch inventory
//       const inventory = await Inventory.findOne({
//         item: itemId,
//         warehouse: sourceWarehouse,
//         companyId: companyId, // 🔐 Important: scope to user's company
//       });
//       if (!inventory) {
//         return NextResponse.json(
//           { message: `No inventory for item ${itemId} in warehouse ${sourceWarehouse}` },
//           { status: 404 }
//         );
//       }

//       // 6️⃣ Deduct quantities
//       if (managedByBatch) {
//         const batch = inventory.batches.find(b => b.batchNumber === batchNumber);
//         if (!batch) {
//           return NextResponse.json(
//             { message: `Batch ${batchNumber} not found in inventory` },
//             { status: 404 }
//           );
//         }
//         if (batch.quantity < quantity) {
//           return NextResponse.json(
//             {
//               message: `Insufficient in batch ${batchNumber}: have ${batch.quantity}, need ${quantity}`
//             },
//             { status: 400 }
//           );
//         }
//         batch.quantity -= quantity;
//       }
//       inventory.quantity = Math.max(0, inventory.quantity - quantity);
//       await inventory.save();

//       // 7️⃣ Prepare IssueProduction record
//       createdRecords.push({
//         productionOrderId,
//         itemId,
//         sourceWarehouse,
//         destinationWarehouse: destinationWarehouse || '',
//         batchNumber: managedByBatch ? batchNumber : '',
//         quantity,
//         expiryDate: expiryDate || null,
//         manufacturer: manufacturer || null,
//         unitPrice: unitPrice || 0,
//         qtyParam,
//         managedByBatch,
//         companyId: companyId, // 🔐 Save companyId with the record
//         createdBy: userId,    // Optional: audit trail
//       });
//     }

//     // 8️⃣ Bulk‑insert all issue records
//     const result = await IssueProduction.insertMany(createdRecords);

//     // 9️⃣ Update the production order (“issued so far” and cost rate)
//     await ProductionOrder.findOneAndUpdate(
//       { _id: productionOrderId, companyId: companyId }, // 🔐 Ensure scoped update
//       {
//         $inc: { issuforproductionqty: qtyParam },
//         $set: { rate: avgCostPrice },
//       }
//     );

//     return NextResponse.json(
//       { message: 'Issued successfully', data: result },
//       { status: 201 }
//     );
//   } catch (err) {
//     console.error('IssueProduction POST Error:', err);
//     return NextResponse.json(
//       { message: 'Internal Server Error', error: err.message },
//       { status: 500 }
//     );
//   }
// }





























