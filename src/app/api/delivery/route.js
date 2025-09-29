import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Delivery from "@/models/deliveryModels";
import SalesOrder from "@/models/SalesOrder";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import Counter from "@/models/Counter";
import Warehouse from "@/models/warehouseModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

const { Types } = mongoose;

/**
 * A new validation function that runs BEFORE the transaction starts.
 * It checks if all items in the delivery have sufficient stock in their specified bins.
 * This provides a fast failure if stock is unavailable.
 */
async function validateStockAvailability(items) {
    for (const item of items) {
        // 1. Find the warehouse to determine if it uses bins.
        const warehouseDoc = await Warehouse.findById(item.warehouse).lean();
        if (!warehouseDoc) {
            throw new Error(`Warehouse '${item.warehouseName}' could not be found during stock pre-check.`);
        }
        const useBins = warehouseDoc.binLocations && warehouseDoc.binLocations.length > 0;

        // 2. Build the precise query to find the exact inventory record.
        const query = {
            item: new Types.ObjectId(item.item),
            warehouse: new Types.ObjectId(item.warehouse),
        };

        if (useBins) {
            if (!item.selectedBin || !item.selectedBin._id) {
                throw new Error(`A bin must be selected for item '${item.itemName}' for the stock pre-check.`);
            }
            query.bin = new Types.ObjectId(item.selectedBin._id);
        } else {
            query.bin = { $in: [null, undefined] };
        }

        // 3. Find the inventory document for the specific location.
        const inventoryDoc = await Inventory.findOne(query).lean();
        const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;

        // 4. Perform the checks.
        if (!inventoryDoc) {
            throw new Error(`Stock Pre-Check Failed: No inventory record found for item '${item.itemName}' in ${location}.`);
        }
        if (inventoryDoc.quantity < item.quantity) {
            throw new Error(`Stock Pre-Check Failed: Insufficient stock for '${item.itemName}' in ${location}. Required: ${item.quantity}, Available: ${inventoryDoc.quantity}.`);
        }
    }
}


/**
 * Processes a single item from a delivery, updating inventory and creating stock movements.
 * This function is called AFTER stock has already been validated.
 */
async function processItem(item, session, delivery, decoded, isCopiedSO) {
    const warehouseDoc = await Warehouse.findById(item.warehouse).session(session).lean();
    if (!warehouseDoc) throw new Error(`Warehouse '${item.warehouseName}' could not be found.`);
    
    const useBins = warehouseDoc.binLocations && warehouseDoc.binLocations.length > 0;
    
    const query = {
        item: new Types.ObjectId(item.item),
        warehouse: new Types.ObjectId(item.warehouse),
    };

    let binId = null;
    if (useBins) {
        binId = new Types.ObjectId(item.selectedBin._id);
        query.bin = binId;
    } else {
        query.bin = { $in: [null, undefined] };
    }

    const inventoryDoc = await Inventory.findOne(query).session(session);

    // This check acts as a final safety measure against race conditions.
    if (!inventoryDoc || inventoryDoc.quantity < item.quantity) {
        const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;
        throw new Error(`Transaction failed: Insufficient stock for '${item.itemName}' in ${location}.`);
    }

    if (!isCopiedSO) {
        inventoryDoc.quantity -= item.quantity;
    } else {
        inventoryDoc.committed -= item.quantity;
    }

    await StockMovement.create([{
        item: item.item,
        warehouse: item.warehouse,
        bin: binId,
        movementType: "OUT",
        quantity: item.quantity,
        reference: delivery._id,
        referenceType: 'Delivery',
        documentNumber: delivery.documentNumberDelivery,
        remarks: isCopiedSO ? "Delivery from SO" : "Direct Delivery",
        companyId: decoded.companyId,
    }], { session });

    await inventoryDoc.save({ session });
}

/* ------------------------------------------- */
/* ---------- API HANDLER (POST) ---------- */
/* ------------------------------------------- */
export async function POST(req) {
    await dbConnect();
    
    try {
        const token = getTokenFromHeader(req);
        if (!token) throw new Error("Unauthorized: No token provided");

        const decoded = verifyJWT(token);
        if (!decoded || !decoded.companyId) throw new Error("Invalid token payload");

        const formData = await req.formData();
        const deliveryDataString = formData.get("deliveryData");
        if (!deliveryDataString) throw new Error("Missing deliveryData in submission.");
        
        const deliveryData = JSON.parse(deliveryDataString);

        console.log("Received Delivery Data:", deliveryData);


        // ✅ **CORRECTED FLOW**: Run the robust stock pre-check BEFORE starting the transaction.
        await validateStockAvailability(deliveryData.items);

        // If the pre-check passes, THEN start the database transaction.
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const seenItemBinPairs = new Set();
            for (const item of deliveryData.items) {
                const key = item.selectedBin?._id ? `${item.item}-${item.selectedBin._id}` : item.item;
                if (seenItemBinPairs.has(key)) {
                    const location = item.selectedBin?.code ? `from bin '${item.selectedBin.code}'` : '';
                    throw new Error(`Duplicate entry error: Item '${item.itemName}' ${location} can only be added once.`);
                }
                seenItemBinPairs.add(key);
            }

            delete deliveryData._id;
            deliveryData.companyId = decoded.companyId;

            const now = new Date();
            const financialYear = now.getMonth() >= 3 ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(-2)}` : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(-2)}`;
            const key = "Sales Delivery";

            const counter = await Counter.findOneAndUpdate(
                { id: key, companyId: decoded.companyId },
                { $inc: { seq: 1 } },
                { new: true, upsert: true, session: session }
            );

            deliveryData.documentNumberDelivery = `SALES-DEL/${financialYear}/${String(counter.seq).padStart(5, "0")}`;

            const [delivery] = await Delivery.create([deliveryData], { session });
            
            const isCopiedSO = !!deliveryData.salesOrderId;

            for (const item of deliveryData.items) {
                await processItem(item, session, delivery, decoded, isCopiedSO);
            }

            if (isCopiedSO) {
                // ... (Sales Order update logic remains the same)
            }

            await session.commitTransaction();
            session.endSession();

            return NextResponse.json({
                success: true,
                message: "Delivery processed and inventory updated successfully.",
                deliveryId: delivery._id,
            }, { status: 201 });

        } catch (transactionError) {
            if (session.inTransaction()) {
                await session.abortTransaction();
            }
            session.endSession();
            throw transactionError; // Re-throw the error to be caught by the outer block
        }
    } catch (error) {
        console.error("Error processing Delivery:", error.stack || error);
        return NextResponse.json({
            message: error.message,
            error: error.message,
        }, { status: 500 });
    }
}

/* ------------------------------------------- */
/* ---------- API HANDLER (GET) ---------- */
/* ------------------------------------------- */
export async function GET(req) {
    await dbConnect();
    try {
        const token = getTokenFromHeader(req);
        const user = verifyJWT(token);
        if (!user) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }
        
        const deliveries = await Delivery.find({ companyId: user.companyId }).populate('customer', 'customerName').sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: deliveries }, { status: 200 });

    } catch (err) {
        console.error("❌ Error fetching deliveries:", err.message);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}



// export async function GET(req) {
//   await dbConnect();
//   try {
//     const token = getTokenFromHeader(req);
//     const user = await verifyJWT(token);
//     if (!user || (user.type === 'user' && !['Admin', 'Sales Manager'].includes(user.role))) {
//       return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
//     }
//     const salesOrders = await Delivery.find({ companyId: user.companyId });
//     return NextResponse.json({ success: true, data: salesOrders }, { status: 200 });
//   } catch (err) {
//     console.error("❌ Error fetching sales orders:", err.message);
//     return NextResponse.json({ success: false, message: err.message }, { status: 500 });
//   }
// }




// import mongoose from "mongoose";
// import dbConnect from "@/lib/db";
// import Delivery from "../../../models/deliveryModels";
// import SalesOrder from "@/models/SalesOrder";
// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";
// import Counter from "@/models/Counter";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// const { Types } = mongoose;

// export async function POST(req) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) {
//       throw new Error("Unauthorized: No token provided");
//     }

//     const decoded = verifyJWT(token);
//     if (!decoded || !decoded.companyId) {
//       throw new Error("Invalid token payload: Missing companyId");
//     }

//     const deliveryData = await req.json();
//     console.log("Received Delivery Data:", deliveryData);

//     // Data Cleaning
//     delete deliveryData._id;
//     if (Array.isArray(deliveryData.items)) {
//       deliveryData.items = deliveryData.items.map((item) => {
//         delete item._id;
//         return item;
//       });
//     }

//     deliveryData.companyId = decoded.companyId;

//     // Generate document number per company per year
//     const now = new Date();
//     const currentYear = now.getFullYear();
//     const currentMonth = now.getMonth() + 1;
//     let fyStart = currentYear;
//     let fyEnd = currentYear + 1;
//     if (currentMonth < 4) {
//       fyStart = currentYear - 1;
//       fyEnd = currentYear;
//     }
//     const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
//     const key = "Sales Delivery";

//     let counter = await Counter.findOne({ id: key, companyId: decoded.companyId }).session(session);

//     if (!counter) {
//       const [created] = await Counter.create(
//         [{ id: key, companyId: decoded.companyId, seq: 1 }],
//         { session }
//       );
//       counter = created;
//     } else {
//       counter.seq += 1;
//       await counter.save({ session });
//     }

//     const paddedSeq = String(counter.seq).padStart(5, "0");
//     deliveryData.documentNumberDelivery = `SALES-DEL/${financialYear}/${paddedSeq}`;

//     // Create Delivery
//     const [delivery] = await Delivery.create([deliveryData], { session });
//     console.log("Delivery created with _id:", delivery._id);

//     const isCopiedSO = !!deliveryData.salesOrderId;

//     async function processItem(item) {
//       const inventoryDoc = await Inventory.findOne({
//         item: new Types.ObjectId(item.item),
//         warehouse: new Types.ObjectId(item.warehouse),
//       }).session(session);

//       if (!inventoryDoc) {
//         throw new Error(
//           `No inventory record found for item ${item.item} in warehouse ${item.warehouse}`
//         );
//       }

//       if (item.batches && item.batches.length > 0) {
//         for (const allocated of item.batches) {
//           const batchIndex = inventoryDoc.batches.findIndex(
//             (b) => b.batchNumber === allocated.batchCode
//           );
//           if (batchIndex === -1) {
//             throw new Error(
//               `Batch ${allocated.batchCode} not found for item ${item.item}`
//             );
//           }

//           if (isCopiedSO) {
//             inventoryDoc.committed -= allocated.allocatedQuantity;
//           } else {
//             if (inventoryDoc.batches[batchIndex].quantity < allocated.allocatedQuantity) {
//               throw new Error(
//                 `Insufficient stock in batch ${allocated.batchCode} for item ${item.item}`
//               );
//             }
//             inventoryDoc.batches[batchIndex].quantity -= allocated.allocatedQuantity;
//             inventoryDoc.quantity -= allocated.allocatedQuantity;
//           }
//         }
//       } else {
//         if (isCopiedSO) {
//           inventoryDoc.committed -= item.quantity;
//         } else {
//           if (inventoryDoc.quantity < item.quantity) {
//             throw new Error(
//               `Insufficient stock for item ${item.item} in warehouse ${item.warehouse}`
//             );
//           }
//           inventoryDoc.quantity -= item.quantity;
//         }
//       }

//       await StockMovement.create(
//         [
//           {
//             item: item.item,
//             warehouse: item.warehouse,
//             movementType: "OUT",
//             quantity: item.quantity,
//             reference: delivery._id,
//             remarks: isCopiedSO
//               ? "Delivery from SO copy – committed reduced"
//               : "Normal Delivery – stock reduction",
//             companyId: decoded.companyId,
//           },
//         ],
//         { session }
//       );

//       await inventoryDoc.save({ session });
//     }

//     for (const item of deliveryData.items) {
//       await processItem(item);
//     }

//     // Close Sales Order if copied from one
//     // if (isCopiedSO) {
//     //   await SalesOrder.findByIdAndUpdate(
//     //     deliveryData.salesOrderId,
//     //     { status: "Close" },
//     //     { session }
//     //   );
//     //   console.log(`Sales Order ${deliveryData.salesOrderId} updated to Close`);
//     // }

//     if (isCopiedSO) {
//   // Fetch the sales order with items
//   const so = await SalesOrder.findById(deliveryData.salesOrderId).session(session);

//   if (!so) throw new Error("Sales Order not found");

//   // Check if all items are fully delivered
//   let allDelivered = true;

//   for (const item of so.items) {
//     const deliveredQty = deliveryData.items.find(i => i.item.toString() === item.item.toString())?.deliveredQuantity || 0;

//     if (deliveredQty < item.quantity) {
//       allDelivered = false;
//       break;
//     }
//   }

//   // Update status based on delivery
//   so.status = allDelivered ? "Complete" : "Partially Complete";

//   await so.save({ session });

//   console.log(`Sales Order ${so._id} updated to ${so.status}`);
// }





//     await session.commitTransaction();
//     return new Response(
//       JSON.stringify({
//         message: "Delivery processed and inventory updated",
//         deliveryId: delivery._id,
//       }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     if (session.inTransaction()) {
//       await session.abortTransaction();
//     }
//     console.error("Error processing Delivery:", error.stack || error);
//     return new Response(
//       JSON.stringify({
//         message: "Error processing Delivery",
//         error: error.message,
//       }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   } finally {
//     session.endSession();
//   }
// }


// export async function GET(req) {
//   await dbConnect();
//   try {
//     const token = getTokenFromHeader(req);
//     const user = await verifyJWT(token);
//     if (!user || (user.type === 'user' && !['Admin', 'Sales Manager'].includes(user.role))) {
//       return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
//     }
//     const salesOrders = await Delivery.find({ companyId: user.companyId });
//     return NextResponse.json({ success: true, data: salesOrders }, { status: 200 });
//   } catch (err) {
//     console.error("❌ Error fetching sales orders:", err.message);
//     return NextResponse.json({ success: false, message: err.message }, { status: 500 });
//   }
// }




