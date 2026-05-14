
import mongoose, { Types } from "mongoose";
import dbConnect from "@/lib/db";            // your db util
import SalesInvoice from "@/models/SalesInvoice"; // the model you pasted

// -----------------------------------------------------------------------------
// POST /api/import/sales-invoice
// Body: { invoices: [ { ...flat CSV / JSON row... } ] }
// -----------------------------------------------------------------------------
// • Maps flat rows -> nested SalesInvoice docs
// • Handles batch and non‑batch items
// • Uses a Mongo transaction so either all docs save or none
// -----------------------------------------------------------------------------

export async function POST(request) {
  await dbConnect();

  const { invoices } = await request.json();
  if (!Array.isArray(invoices) || invoices.length === 0) {
    return Response.json(
      { success: false, error: "Body must be { invoices: [...] }" },
      { status: 400 }
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Helper: map flat row to nested doc
  // ────────────────────────────────────────────────────────────────────────────
  const num = (v) => (v === "" || v === undefined ? 0 : Number(v));

  const rowToInvoiceDoc = (row) => {
        const item = {
      // Required ObjectId references – if missing, generate a placeholder so
      // validation passes (you can later back‑fill real references).
      item:       Types.ObjectId.isValid(row.item) ? row.item : new Types.ObjectId(),
      warehouse:  Types.ObjectId.isValid(row.warehouse) ? row.warehouse : new Types.ObjectId(),

      itemCode:        row.itemCode,
      itemName:        row.itemName,
      itemDescription: row.itemDescription,
      quantity:        num(row.quantity),
      unitPrice:       num(row.unitPrice),
      discount:        num(row.discount),
      priceAfterDiscount: num(row.priceAfterDiscount),
      totalAmount:     num(row.totalAmount),
      gstAmount:       num(row.gstAmount),
      igstAmount:      num(row.igstAmount),
      warehouseName:   row.warehouseName,
      warehouseCode:   row.warehouseCode,
      taxOption:       row.taxOption || "GST",
      managedByBatch:  String(row.managedByBatch).toLowerCase() === "true",
    };

    if (item.managedByBatch && row.batchCode) {
      item.batches = [
        {
          batchCode:        row.batchCode,
          expiryDate:       row.expiryDate ? new Date(row.expiryDate) : null,
          manufacturer:     row.manufacturer,
          allocatedQuantity: num(row.allocatedQuantity || row.quantity),
          availableQuantity: num(row.availableQuantity),
        },
      ];
    }

    return {
      invoiceNumber:       row.invoiceNumber || undefined,
      customerCode:        row.customerCode,
      customerName:        row.customerName,
      contactPerson:       row.contactPerson,
      refNumber:           row.refNumber,
      salesEmployee:       row.salesEmployee,
      orderDate:           row.orderDate ? new Date(row.orderDate) : undefined,
      expectedDeliveryDate:row.expectedDeliveryDate ? new Date(row.expectedDeliveryDate) : undefined,
      remarks:             row.remarks,
      freight:             num(row.freight),
      rounding:            num(row.rounding),
      totalDownPayment:    num(row.totalDownPayment),
      appliedAmounts:      num(row.appliedAmounts),
      totalBeforeDiscount: num(row.totalBeforeDiscount),
      gstTotal:            num(row.gstTotal),
      grandTotal:          num(row.grandTotal),
      openBalance:         num(row.openBalance),
      paymentStatus:       row.paymentStatus || "Pending",
      items: [item],
    };
  };

  const docs = invoices.map(rowToInvoiceDoc);

    // ────────────────────────────────────────────────────────────────────────────
  // Transaction – optional (Mongo transactions need a replica‑set). If the
  // current connection is a standalone server, we fall back to a simple
  // insertMany.
  // ────────────────────────────────────────────────────────────────────────────

  const isReplica = mongoose.connection?.topology?.description?.type === "ReplicaSet";

  try {
    let result;

    if (isReplica) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        result = await SalesInvoice.insertMany(docs, { session, ordered: false });
        await session.commitTransaction();
        session.endSession();
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        throw err;
      }
    } else {
      // No replica‑set → insert without a transaction
      result = await SalesInvoice.insertMany(docs, { ordered: false });
    }

    return Response.json({ success: true, inserted: result.length });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 400 }
    );
  }
}