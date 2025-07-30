import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Inventory from '@/models/Inventory';
import ProductionOrder from '@/models/ProductionOrder';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';

export async function POST(req, { params }) {
  try {
    await connectDB();

    // ===== Authenticate User =====
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized: No token' }, { status: 401 });
    }

    const user = verifyJWT(token);
    if (!user || !user.companyId) {
      return NextResponse.json({ message: 'Unauthorized or company ID missing' }, { status: 401 });
    }

    const companyId = user.companyId;

    const { productionOrderId } = params;
    const { searchParams } = new URL(req.url);
    const qtyParam = Number(searchParams.get('qty'));

    const payload = await req.json();
    const data = payload.data || payload;
    const avgCostPrice = payload.avgCostPrice || 0;

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ message: 'Invalid data array' }, { status: 400 });
    }

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
      } = entry;

      if (!itemId || !sourceWarehouse || !destinationWarehouse || quantity == null || quantity <= 0) {
        return NextResponse.json({ message: 'Missing or invalid fields in entry' }, { status: 400 });
      }

      // ===== Fetch Source Inventory =====
      const sourceInventory = await Inventory.findOne({ item: itemId, warehouse: sourceWarehouse, companyId });

      if (!sourceInventory || sourceInventory.quantity < quantity) {
        return NextResponse.json({ message: `Insufficient quantity in source warehouse` }, { status: 400 });
      }

      const isBatchManaged = !!batchNumber;

      // ===== Update Batch Info if batch-managed =====
      if (isBatchManaged) {
        const sourceBatch = sourceInventory.batches.find(b => b.batchNumber === batchNumber);
        if (!sourceBatch || sourceBatch.quantity < quantity) {
          return NextResponse.json({ message: `Batch '${batchNumber}' not found or insufficient quantity` }, { status: 400 });
        }
        sourceBatch.quantity = Math.max(0, sourceBatch.quantity - quantity);
      }

      sourceInventory.quantity = Math.max(0, sourceInventory.quantity - quantity);
      await sourceInventory.save();

      // ===== Update/Add to Destination Inventory =====
      let destInventory = await Inventory.findOne({ item: itemId, warehouse: destinationWarehouse, companyId });

      if (!destInventory) {
        destInventory = new Inventory({
          item: itemId,
          warehouse: destinationWarehouse,
          companyId, // ✅ required field
          quantity: 0,
          batches: [],
        });
      }

      if (isBatchManaged) {
        let destBatch = destInventory.batches.find(b => b.batchNumber === batchNumber);
        if (destBatch) {
          destBatch.quantity += quantity;
        } else {
          destInventory.batches.push({
            batchNumber,
            quantity,
            expiryDate: expiryDate || null,
            manufacturer: manufacturer || null,
            unitPrice: unitPrice || avgCostPrice || 0,
          });
        }
      }

      destInventory.quantity += quantity;
      await destInventory.save();
    }

    // ===== Update Production Order Transfer Status =====
    await ProductionOrder.findByIdAndUpdate(
      productionOrderId,
      {
        $set: { status: 'transferred' },
        $inc: { transferqty: qtyParam || 0 },
      },
      { new: true }
    );

    return NextResponse.json({
      message: 'Stock transfer successful',
      transferred: data.length,
      orderId: productionOrderId,
    }, { status: 200 });

  } catch (err) {
    console.error('Transfer error:', err);
    return NextResponse.json({ message: 'Server error', error: err.message }, { status: 500 });
  }
}


































// import { NextResponse } from 'next/server';
// import connectDB from '@/lib/db';
// import Inventory from '@/models/Inventory';
// import ProductionOrder from '@/models/ProductionOrder';

// export async function POST(req, { params }) {
//   try {
//     await connectDB();

//     const { productionOrderId } = params;
//     const { searchParams } = new URL(req.url);
//     const qtyParam = Number(searchParams.get('qty'));

//     const payload = await req.json();
//     const data = payload.data || payload; // Accept either { data: [...] } or direct array
//     const avgCostPrice = payload.avgCostPrice || 0;

//     if (!Array.isArray(data) || data.length === 0) {
//       return NextResponse.json({ message: 'Invalid data array' }, { status: 400 });
//     }

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
//       } = entry;

//       if (!itemId || !sourceWarehouse || !destinationWarehouse || quantity == null || quantity <= 0) {
//         return NextResponse.json({ message: 'Missing or invalid fields in entry' }, { status: 400 });
//       }

//       // ===== Fetch Source Inventory =====
//       const sourceInventory = await Inventory.findOne({ item: itemId, warehouse: sourceWarehouse });

//       if (!sourceInventory || sourceInventory.quantity < quantity) {
//         return NextResponse.json({ message: `Insufficient quantity in source warehouse` }, { status: 400 });
//       }

//       const isBatchManaged = !!batchNumber;

//       // ===== Update Batch Info if batch-managed =====
//       if (isBatchManaged) {
//         const sourceBatch = sourceInventory.batches.find(b => b.batchNumber === batchNumber);
//         if (!sourceBatch || sourceBatch.quantity < quantity) {
//           return NextResponse.json({ message: `Batch '${batchNumber}' not found or insufficient quantity` }, { status: 400 });
//         }
//         sourceBatch.quantity = Math.max(0, sourceBatch.quantity - quantity);
//       }

//       sourceInventory.quantity = Math.max(0, sourceInventory.quantity - quantity);
//       await sourceInventory.save();

//       // ===== Update/Add to Destination Inventory =====
//       let destInventory = await Inventory.findOne({ item: itemId, warehouse: destinationWarehouse });

//       if (!destInventory) {
//         destInventory = new Inventory({
//           item: itemId,
//           warehouse: destinationWarehouse,
//           quantity: 0,
//           batches: [],
//         });
//       }

//       if (isBatchManaged) {
//         let destBatch = destInventory.batches.find(b => b.batchNumber === batchNumber);
//         if (destBatch) {
//           destBatch.quantity += quantity;
//         } else {
//           destInventory.batches.push({
//             batchNumber,
//             quantity,
//             expiryDate: expiryDate || null,
//             manufacturer: manufacturer || null,
//             unitPrice: unitPrice || avgCostPrice || 0,
//           });
//         }
//       }

//       destInventory.quantity += quantity;
//       await destInventory.save();
//     }

//     // ===== Update Production Order Transfer Status =====
//     await ProductionOrder.findByIdAndUpdate(
//       productionOrderId,
//       {
//         $set: { status: 'transferred' }, // You can enhance this with partial transfer tracking if needed
//         $inc: { transferqty: qtyParam || 0 },
//       },
//       { new: true }
//     );

//     return NextResponse.json({
//       message: 'Stock transfer successful',
//       transferred: data.length,
//       orderId: productionOrderId,
//     }, { status: 200 });
//   } catch (err) {
//     console.error('Transfer error:', err);
//     return NextResponse.json({ message: 'Server error', error: err.message }, { status: 500 });
//   }
// }







































































// import { NextResponse } from 'next/server';
// import connectDB from '@/lib/db';
// import Inventory from '@/models/Inventory';
// import ProductionOrder from '@/models/ProductionOrder';

// // This handles a dynamic route like: /api/stock-transfer/[productionOrderId]?qty=8
// export async function POST(req, { params }) {
//   try {
//     await connectDB();

//     const { productionOrderId } = params;
//     const { searchParams } = new URL(req.url);
//     const qtyParam = Number(searchParams.get('qty'));

//     const data = await req.json(); // assuming this contains itemId, sourceWarehouse, etc.

//     console.log('Received data:', data);

//     if (!Array.isArray(data) || data.length === 0) {
//       return NextResponse.json({ message: 'Invalid data array' }, { status: 400 });
//     }

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
//       } = entry;

//       if (!itemId || !sourceWarehouse || !destinationWarehouse || !batchNumber || !quantity) {
//         return NextResponse.json({ message: 'Missing required fields in entry' }, { status: 400 });
//       }

//       // ===== Deduct from source warehouse =====
//       const sourceInventory = await Inventory.findOne({ item: itemId, warehouse: sourceWarehouse });

//       if (!sourceInventory) {
//         return NextResponse.json({ message: `No inventory found in source warehouse` }, { status: 404 });
//       }

//       const sourceBatch = sourceInventory.batches.find(b => b.batchNumber === batchNumber);
//       if (!sourceBatch || sourceBatch.quantity < quantity) {
//         return NextResponse.json({ message: `Insufficient batch quantity or batch not found` }, { status: 400 });
//       }

//       sourceBatch.quantity -= quantity;
//       sourceInventory.quantity = Math.max(0, sourceInventory.quantity - quantity);
//       await sourceInventory.save();

//       // ===== Add to destination warehouse =====
//       let destInventory = await Inventory.findOne({ item: itemId, warehouse: destinationWarehouse });

//       if (!destInventory) {
//         destInventory = new Inventory({ item: itemId, warehouse: destinationWarehouse, quantity: 0, batches: [] });
//       }

//       let destBatch = destInventory.batches.find(b => b.batchNumber === batchNumber);
//       if (destBatch) {
//         destBatch.quantity += quantity;
//       } else {
//         destInventory.batches.push({ batchNumber, quantity, expiryDate, manufacturer, unitPrice });
//       }

//       destInventory.quantity += quantity;
//       await destInventory.save();
//     }

//     // ===== Update ProductionOrder after loop =====
//     await ProductionOrder.findByIdAndUpdate(
//       productionOrderId,
//       {
//         $set: { status: 'transferred' },
//         $inc: { transferqty: qtyParam || 0 },
//       },
//       { new: true }
//     );

//     return NextResponse.json({ message: 'Stock transfer successful' }, { status: 200 });

//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ message: 'Server error', error: err.message }, { status: 500 });
//   }
// }



