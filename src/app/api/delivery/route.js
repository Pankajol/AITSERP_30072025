import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Delivery from "../../../models/deliveryModels"; // Your Delivery model
import SalesOrder from "@/models/SalesOrder"; // Your Sales Order model
import Inventory from "@/models/Inventory";   // Inventory model (includes batches)
import StockMovement from "@/models/StockMovement"; // Model for logging stock movements



const { Types } = mongoose;

export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const deliveryData = await req.json();
    console.log("Received Delivery Data:", deliveryData);

    // ----- Data Cleaning -----
    delete deliveryData._id;
    if (Array.isArray(deliveryData.items)) {
      deliveryData.items = deliveryData.items.map((item) => {
        delete item._id;
        return item;
      });
    }

    // ----- Create Delivery Document -----
    const [delivery] = await Delivery.create([deliveryData], { session });
    console.log("Delivery created with _id:", delivery._id);

    // Determine if this delivery was copied from a Sales Order.
    const isCopiedSO = !!deliveryData.salesOrderId;

    // ----- Process Each Delivery Item: Update Inventory & Log Stock Movement -----
    async function processItem(item) {
      const inventoryDoc = await Inventory.findOne({
        item: new Types.ObjectId(item.item),
        warehouse: new Types.ObjectId(item.warehouse),
      }).session(session);

      if (!inventoryDoc) {
        throw new Error(
          `No inventory record found for item ${item.item} in warehouse ${item.warehouse}`
        );
      }

      if (item.batches && item.batches.length > 0) {
        for (const allocated of item.batches) {
          const batchIndex = inventoryDoc.batches.findIndex(
            (b) => b.batchNumber === allocated.batchCode
          );
          if (batchIndex === -1) {
            throw new Error(
              `Batch ${allocated.batchCode} not found in inventory for item ${item.item}`
            );
          }
          if (isCopiedSO) {
            // For SO copy, reduce committed quantity.
            inventoryDoc.committed -= allocated.allocatedQuantity;
          } else {
            if (inventoryDoc.batches[batchIndex].quantity < allocated.allocatedQuantity) {
              throw new Error(
                `Insufficient stock in batch ${allocated.batchCode} for item ${item.item}`
              );
            }
            inventoryDoc.batches[batchIndex].quantity -= allocated.allocatedQuantity;
            inventoryDoc.quantity -= item.quantity;
          }
        }
      } else {
        if (isCopiedSO) {
          inventoryDoc.committed -= item.quantity;
        } else {
          if (inventoryDoc.quantity < item.quantity) {
            throw new Error(
              `Insufficient stock for item ${item.item} in warehouse ${item.warehouse}`
            );
          }
          inventoryDoc.quantity -= item.quantity;
        }
      }

      await StockMovement.create(
        [
          {
            item: item.item,
            warehouse: item.warehouse,
            movementType: "OUT",
            quantity: item.quantity,
            reference: delivery._id,
            remarks: isCopiedSO
              ? "Delivery from SO copy – committed reduced"
              : "Normal Delivery – stock reduction",
          },
        ],
        { session }
      );

      await inventoryDoc.save({ session });
    }

    for (const item of deliveryData.items) {
      await processItem(item);
    }

    // If delivery was copied from a Sales Order, update that Sales Order's status.
    if (isCopiedSO) {
      await SalesOrder.findByIdAndUpdate(
        deliveryData.salesOrderId,
        { status: "Close" },
        { session }
      );
      console.log(`Sales Order ${deliveryData.salesOrderId} updated to Close`);
    }

    await session.commitTransaction();
    return new Response(
      JSON.stringify({
        message: "Delivery processed and inventory updated",
        deliveryId: delivery._id,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    // Only abort if the transaction is still active.
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("Error processing Delivery:", error.stack || error);
    return new Response(
      JSON.stringify({
        message: "Error processing Delivery",
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  } finally {
    session.endSession();
  }
}




// import mongoose from "mongoose";
// import dbConnect  from "@/lib/db";
// import Delivery from "@/models/deliveryModels"; // Assume you have a Delivery model.
// import SalesOrder from "@/models/SalesOrder";

// export async function POST(req) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const deliveryData = await req.json();
//     // Create a Delivery record.
//     const [delivery] = await Delivery.create([deliveryData], { session });
    
//     // Optionally, update the associated Sales Order's status (if referenced)
//     if (deliveryData.salesOrderId) {
//       await SalesOrder.updateOne(
//         { _id: deliveryData.salesOrderId },
//         { $set: { status: "Delivered" } },
//         { session }
//       );
//     }

//     await session.commitTransaction();
//     session.endSession();
//     return new Response(
//       JSON.stringify({ message: "Delivery record created", deliveryId: delivery._id }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("Error creating Delivery record:", error);
//     return new Response(
//       JSON.stringify({ message: "Error creating Delivery record", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }
