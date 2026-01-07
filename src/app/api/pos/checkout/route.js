export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Inventory from "@/models/Inventory";
import POSCustomer from "@/models/pos/POSCustomer";
import POSSale from "@/models/pos/POSInvoice";
import StockMovement from "@/models/StockMovement";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

export async function POST(req) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    const user = verifyJWT(token);
    const body = await req.json();
    const { customerId, items, discount, payment, totals } = body;

    // --- 🟢 STEP 1: GENERATE SEQUENTIAL INVOICE NUMBER ---
    const count = await POSSale.countDocuments({ companyId: user.companyId });
    const nextInvoiceNum = count + 1;
    const d = new Date();
    const datePart = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const customInvoiceNo = `INV-${nextInvoiceNum}-${datePart}`;

    // --- 🟢 STEP 2: FINANCIAL CALCULATIONS ---
    const grandTotal = Number(totals.grandTotal) || 0;
    const paymentReceived = Number(payment.received) || 0;

    // If they pay more than the bill -> they get change (balanceReturned)
    // If they pay less than the bill -> they owe money (dueAmount)
    const balanceReturned = paymentReceived > grandTotal ? paymentReceived - grandTotal : 0;
    const dueAmount = paymentReceived < grandTotal ? grandTotal - paymentReceived : 0;

    const itemIds = items.map((i) => i.inventoryId);
    const inventoryItems = await Inventory.find({ _id: { $in: itemIds } }).populate("item");

    for (const cartItem of items) {
      const invRecord = inventoryItems.find((inv) => inv._id.toString() === cartItem.inventoryId);
      if (!invRecord || invRecord.quantity < cartItem.qty) {
        throw new Error(`Insufficient stock for ${cartItem.itemName}`);
      }

      await Inventory.findByIdAndUpdate(
        cartItem.inventoryId,
        { $inc: { quantity: -cartItem.qty } },
        { session }
      );

      await StockMovement.create([{
        companyId: user.companyId,
        createdBy: user._id,
        item: invRecord.item._id,
        warehouse: invRecord.warehouse,
        movementType: "POS_SALE",
        quantity: -cartItem.qty,
        reference: customInvoiceNo,
        date: new Date(),
      }], { session });
    }

    // --- 🟢 STEP 3: CREATE SALE RECORD ---
    const sale = await POSSale.create([{
      companyId: user.companyId,
      customerId,
      invoiceNo: customInvoiceNo,
      items: items.map((i) => ({
        inventoryId: i.inventoryId,
        itemName: i.itemName,
        qty: Number(i.qty),
        price: Number(i.price),
        gstRate: Number(i.gstRate || 0),
      })),
      netTotal: Number(totals.netTotal),
      taxableAmount: Number(totals.taxableAmount),
      cgst: Number(totals.cgst),
      sgst: Number(totals.sgst),
      discount: discount,
      grandTotal: grandTotal,
      paymentReceived: paymentReceived,
      balanceReturned: balanceReturned, // Money returned to customer
      dueAmount: dueAmount,             // Debt to be collected later
      status: dueAmount > 0 ? "Partially Paid" : "Completed",
      soldBy: user._id,
    }], { session });

    await POSCustomer.findByIdAndUpdate(
      customerId,
      { lastPurchaseAt: new Date() },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ 
      success: true, 
      invoiceId: sale[0]._id, 
      customInvoiceNo: customInvoiceNo,
      dueAmount: dueAmount
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}


// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import Inventory from "@/models/Inventory";
// import POSCustomer from "@/models/pos/POSCustomer";
// import POSSale from "@/models/pos/POSInvoice";
// import StockMovement from "@/models/StockMovement"; // ✅ Added StockMovement Model
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { NextResponse } from "next/server";
// import mongoose from "mongoose";

// /**
//  * POST → Process POS Sale, Reduce Stock & Log Movement
//  */
// export async function POST(req) {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     await dbConnect();

//     const token = getTokenFromHeader(req);
//     const user = verifyJWT(token);

//     const body = await req.json();
//     const { customerId, items, discount, payment, totals } = body;

//     // 1. Basic Validation
//     if (!items || items.length === 0) {
//       return NextResponse.json({ success: false, message: "Cart is empty" }, { status: 400 });
//     }

//     const itemIds = items.map((i) => i.inventoryId);
//     // Fetch inventory and populate item/warehouse info for movement logs
//     const inventoryItems = await Inventory.find({ _id: { $in: itemIds } }).populate("item");

//     // 2. Process Items: Stock Validation, Inventory Update, and Movement Logging
//     for (const cartItem of items) {
//       const invRecord = inventoryItems.find((inv) => inv._id.toString() === cartItem.inventoryId);

//       if (!invRecord) {
//         throw new Error(`Item ${cartItem.itemName} not found in inventory.`);
//       }

//       if (invRecord.quantity < cartItem.qty) {
//         throw new Error(`Insufficient stock for ${cartItem.itemName}. Available: ${invRecord.quantity}`);
//       }

//       // A. Deduct stock from Inventory
//       await Inventory.findByIdAndUpdate(
//         cartItem.inventoryId,
//         { $inc: { quantity: -cartItem.qty } },
//         { session }
//       );

//       // B. Create Stock Movement Record ✅
//       await StockMovement.create(
//         [
//           {
//             companyId: user.companyId,
//             createdBy: user._id,
//             item: invRecord.item._id, // The actual Item ID
//             warehouse: invRecord.warehouse, // From inventory record
//             bin: invRecord.bin || null,
//             movementType: "POS_SALE",
//             quantity: -cartItem.qty, // Negative because it's an outflow
//             reference: `POS-INV-${Date.now()}`, // Temporary ref, will update with Sale ID if needed
//             remarks: `POS Sale to Customer: ${customerId}`,
//             date: new Date(),
//           },
//         ],
//         { session }
//       );
//     }

//     // 3. Create Sale Record (Invoice)
//     const sale = await POSSale.create(
//       [
//         {
//           companyId: user.companyId,
//           customerId,
//           items: items.map((i) => ({
//             inventoryId: i.inventoryId,
//             itemName: i.itemName,
//             qty: i.qty,
//             price: i.price,
//           })),
//           netTotal: totals.netTotal,
//           discount: discount,
//           grandTotal: totals.grandTotal,
//           paymentReceived: payment.received,
//           balanceReturned: payment.balance,
//           status: "Completed",
//           soldBy: user._id,
//         },
//       ],
//       { session }
//     );

//     // 4. Update Customer's Last Purchase Date
//     await POSCustomer.findByIdAndUpdate(
//       customerId,
//       { lastPurchaseAt: new Date() },
//       { session }
//     );

//     await session.commitTransaction();
//     session.endSession();

//     return NextResponse.json({
//       success: true,
//       message: "Sale completed and stock movements logged",
//       invoiceId: sale[0]._id,
//     });

//   } catch (err) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("CHECKOUT ERROR:", err);
//     return NextResponse.json(
//       { success: false, message: err.message || "Checkout failed" },
//       { status: 500 }
//     );
//   }
// }