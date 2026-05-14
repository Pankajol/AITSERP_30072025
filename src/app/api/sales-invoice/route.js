import mongoose from "mongoose";
import { Readable } from "stream";
import formidable from "formidable";
import { v2 as cloudinary } from "cloudinary";
import dbConnect from "@/lib/db";
import SalesInvoice from "@/models/SalesInvoice";
import SalesOrder from "@/models/SalesOrder";
import Counter from "@/models/Counter";
import Warehouse from "@/models/warehouseModels";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import Customer from "@/models/CustomerModel";
import Item from "@/models/ItemModels";
import AccountHead from "@/models/accounts/AccountHead";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { autoSalesInvoice, autoPaymentReceipt } from "@/lib/autoTransaction";
import { NextResponse } from "next/server";

export const config = { api: { bodyParser: false } };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const { Types } = mongoose;

// --------------------------------------------------------------
// Helper: parse multipart form data
// --------------------------------------------------------------
async function parseMultipart(req) {
  const buf = Buffer.from(await req.arrayBuffer());
  const nodeReq = new Readable();
  nodeReq.push(buf);
  nodeReq.push(null);
  nodeReq.headers = Object.fromEntries(req.headers.entries());
  nodeReq.method = req.method;
  const form = formidable({ multiples: true, keepExtensions: true });
  return new Promise((resolve, reject) => {
    form.parse(nodeReq, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

// --------------------------------------------------------------
// Validate physical stock (variant & bin aware)
// --------------------------------------------------------------
async function validateStockAvailability(items, companyId) {
  for (const item of items) {
    const warehouse = await Warehouse.findById(item.warehouse).lean();
    if (!warehouse) throw new Error(`Warehouse '${item.warehouseName}' not found.`);

    const useBins = warehouse.binLocations?.length > 0;
    const variantId = item.variant?.variantId || item.selectedVariantId;

    const query = {
      companyId: new Types.ObjectId(companyId),
      item: new Types.ObjectId(item.item),
      warehouse: new Types.ObjectId(item.warehouse),
    };
    if (useBins) {
      if (!item.selectedBin?._id && !item.selectedBin)
        throw new Error(`Bin required for item '${item.itemName}'.`);
      const binId = item.selectedBin?._id || item.selectedBin;
      query.bin = new Types.ObjectId(binId);
    } else {
      query.bin = { $in: [null, undefined] };
    }

    const inventory = await Inventory.findOne(query).lean();
    if (!inventory)
      throw new Error(`No inventory record for '${item.itemName}' in ${warehouse.warehouseName}.`);

    let available = 0;
    if (variantId) {
      const variantInv = inventory.variantInventory?.find(
        v => v.variantId.toString() === variantId.toString()
      );
      if (!variantInv)
        throw new Error(`Variant '${item.itemCode}' not found in inventory.`);
      available = variantInv.quantity;
    } else {
      available = inventory.quantity;
    }

    if (available < item.quantity) {
      throw new Error(
        `Insufficient stock for ${item.itemName}${variantId ? ` (${item.itemCode})` : ''}. ` +
        `Required: ${item.quantity}, Available: ${available}.`
      );
    }
  }
}

// --------------------------------------------------------------
// Process one item: deduct physical stock & committed (if from SO)
// --------------------------------------------------------------
async function processItemForInvoice(item, invoiceId, invoiceNumber, decoded, session, isCopiedSO) {
  console.log(`🔄 Invoice item: ${item.itemCode}, qty: ${item.quantity}, fromSO: ${isCopiedSO}`);

  const warehouse = await Warehouse.findById(item.warehouse).session(session);
  if (!warehouse) throw new Error(`Warehouse '${item.warehouseName}' not found.`);

  const useBins = warehouse.binLocations?.length > 0;
  const variantId = item.variant?.variantId || item.selectedVariantId;

  const query = {
    companyId: new Types.ObjectId(decoded.companyId),
    item: new Types.ObjectId(item.item),
    warehouse: new Types.ObjectId(item.warehouse),
  };
  let binId = null;
  if (useBins) {
    const binIdValue = item.selectedBin?._id || item.selectedBin;
    if (!binIdValue) throw new Error(`Bin required for item '${item.itemName}'.`);
    binId = new Types.ObjectId(binIdValue);
    query.bin = binId;
  } else {
    query.bin = { $in: [null, undefined] };
  }

  let inventory = await Inventory.findOne(query).session(session);
  if (!inventory) {
    inventory = new Inventory({
      companyId: decoded.companyId,
      item: new Types.ObjectId(item.item),
      warehouse: new Types.ObjectId(item.warehouse),
      bin: binId,
      quantity: 0,
      committed: 0,
      onOrder: 0,
      hasVariants: !!variantId,
      variantInventory: [],
    });
  }

  if (variantId) {
    let variantInv = inventory.variantInventory.find(v => v.variantId.toString() === variantId.toString());
    if (!variantInv) {
      variantInv = {
        variantId: new Types.ObjectId(variantId),
        sku: item.itemCode,
        quantity: 0,
        committed: 0,
        onOrder: 0,
        batches: [],
      };
      inventory.variantInventory.push(variantInv);
    }
    if (variantInv.quantity < item.quantity)
      throw new Error(`Insufficient stock for variant ${item.itemCode}`);
    if (isCopiedSO) {
      variantInv.committed = Math.max(0, (variantInv.committed || 0) - item.quantity);
    }
    variantInv.quantity -= item.quantity;
  } else {
    if (inventory.quantity < item.quantity)
      throw new Error(`Insufficient stock for ${item.itemName}`);
    if (isCopiedSO) {
      inventory.committed = Math.max(0, (inventory.committed || 0) - item.quantity);
    }
    inventory.quantity -= item.quantity;
  }

  await inventory.save({ session });

  await StockMovement.create([{
    companyId: decoded.companyId,
    createdBy: decoded.id,
    item: new Types.ObjectId(item.item),
    variantId: variantId ? new Types.ObjectId(variantId) : null,
    warehouse: new Types.ObjectId(item.warehouse),
    bin: binId,
    movementType: "OUT",
    quantity: item.quantity,
    reference: invoiceId,
    referenceType: "SalesInvoice",
    documentNumber: invoiceNumber,
    remarks: isCopiedSO ? "Invoice from Sales Order (released committed + physical)" : "Direct Invoice (physical only)",
    date: new Date(),
  }], { session });
}

// --------------------------------------------------------------
// Restore stock when invoice is deleted/cancelled
// --------------------------------------------------------------
async function restoreStockForInvoice(invoice, decoded, session) {
  for (const item of invoice.items) {
    const warehouse = await Warehouse.findById(item.warehouse).session(session);
    if (!warehouse) continue;
    const useBins = warehouse.binLocations?.length > 0;
    const variantId = item.variant?.variantId || item.selectedVariantId;
    const query = {
      companyId: new Types.ObjectId(decoded.companyId),
      item: new Types.ObjectId(item.item),
      warehouse: new Types.ObjectId(item.warehouse),
    };
    if (useBins && (item.selectedBin?._id || item.selectedBin)) {
      const binId = item.selectedBin?._id || item.selectedBin;
      query.bin = new Types.ObjectId(binId);
    } else {
      query.bin = { $in: [null, undefined] };
    }
    const inventory = await Inventory.findOne(query).session(session);
    if (inventory) {
      if (variantId) {
        let variantInv = inventory.variantInventory.find(v => v.variantId.toString() === variantId.toString());
        if (variantInv) {
          variantInv.quantity += item.quantity;
          if (invoice.sourceModel === 'salesorder') {
            variantInv.committed = (variantInv.committed || 0) + item.quantity;
          }
        }
      } else {
        inventory.quantity += item.quantity;
        if (invoice.sourceModel === 'salesorder') {
          inventory.committed = (inventory.committed || 0) + item.quantity;
        }
      }
      await inventory.save({ session });
    }
  }
}

// --------------------------------------------------------------
// Update Sales Order invoiced quantities and status
// --------------------------------------------------------------
async function updateSalesOrderOnInvoice(salesOrderId, items, session, isAdding = true) {
  const salesOrder = await SalesOrder.findOne({ _id: salesOrderId }).session(session);
  if (!salesOrder) return;

  let anyInvoiced = false;
  let allInvoiced = true;

  for (const invItem of items) {
    const soItem = salesOrder.items.find(it => it.item.toString() === invItem.item.toString());
    if (soItem) {
      const change = isAdding ? invItem.quantity : -invItem.quantity;
      soItem.invoicedQuantity = (soItem.invoicedQuantity || 0) + change;
      soItem.invoicedQuantity = Math.max(0, soItem.invoicedQuantity);
      
      const remainingToInvoice = (soItem.quantity || 0) - soItem.invoicedQuantity;
      if (remainingToInvoice > 0) allInvoiced = false;
      if (soItem.invoicedQuantity > 0) anyInvoiced = true;
      
      console.log(`SO item ${soItem.itemCode}: invoiced=${soItem.invoicedQuantity}, remaining=${remainingToInvoice}`);
    }
  }

  // Update status based on invoicing
  if (allInvoiced && anyInvoiced) {
    salesOrder.status = "Fully Invoiced";
  } else if (anyInvoiced) {
    salesOrder.status = "Partially Invoiced";
  } else {
    // No invoiced quantity – revert to appropriate previous status
    if (salesOrder.status === "Fully Invoiced") salesOrder.status = "Partially Invoiced";
    else if (salesOrder.status === "Partially Invoiced") salesOrder.status = "Open";
  }
  
  await salesOrder.save({ session });
}

// --------------------------------------------------------------
// POST – Create Invoice
// --------------------------------------------------------------
export async function POST(req) {
  await dbConnect();

  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized");
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) throw new Error("Invalid token");

    const { fields, files } = await parseMultipart(req);
    let invoiceData = JSON.parse(fields.invoiceData || "{}");

    const sourceModel = (invoiceData.sourceModel || "").toLowerCase();
    const isFromDelivery = sourceModel === 'delivery';
    const isCopiedSO = sourceModel === 'salesorder';

    console.log(`📌 Source: "${sourceModel}" → isFromDelivery: ${isFromDelivery}, isCopiedSO: ${isCopiedSO}`);

    // Clean payments
    if (invoiceData.payments && Array.isArray(invoiceData.payments)) {
      invoiceData.payments = invoiceData.payments.map(pmt => {
        Object.keys(pmt).forEach(key => {
          if (pmt[key] === "") pmt[key] = null;
          if (key === 'paymentDate' && typeof pmt[key] === 'string') pmt[key] = new Date(pmt[key]);
        });
        return pmt;
      });
    }

    // Payment summary
    let payments = invoiceData.payments || [];
    let totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    if (totalPaid === 0 && (Number(invoiceData.paidAmount) || 0) > 0) {
      totalPaid = Number(invoiceData.paidAmount);
      payments = [{
        amount: totalPaid,
        method: invoiceData.paymentMethod || "cash",
        bankAccountId: invoiceData.bankAccountId || null,
        paymentDate: invoiceData.paymentDate || invoiceData.invoiceDate || new Date(),
        notes: invoiceData.paymentNotes || "Payment recorded at invoice creation"
      }];
    }
    const grandTotal = Number(invoiceData.grandTotal) || 0;
    const remainingAmount = Math.max(grandTotal - totalPaid, 0);
    invoiceData.paidAmount = totalPaid;
    invoiceData.remainingAmount = remainingAmount;
    invoiceData.payments = payments;
    invoiceData.paymentStatus = totalPaid === 0 ? "Pending" : (totalPaid >= grandTotal ? "Paid" : "Partial");

    // Stock validation (skip only for delivery copies)
    if (!isFromDelivery) {
      await validateStockAvailability(invoiceData.items, decoded.companyId);
    }

    // Upload attachments
    const attachmentFiles = files.attachments || files.newAttachments;
    const newFiles = Array.isArray(attachmentFiles) ? attachmentFiles : attachmentFiles ? [attachmentFiles] : [];
    const uploadedFiles = await Promise.all(newFiles.map(async (file) => {
      const result = await cloudinary.uploader.upload(file.filepath, {
        folder: "sales-invoices",
        resource_type: "auto"
      });
      return {
        fileName: file.originalFilename,
        fileUrl: result.secure_url,
        fileType: file.mimetype,
        publicId: result.public_id,
        uploadedAt: new Date()
      };
    }));
    invoiceData.attachments = [...(invoiceData.attachments || []), ...uploadedFiles];

    // Resolve customer
    let customerId = invoiceData.customer?._id || invoiceData.customer || invoiceData.customerId;
    let customerName = invoiceData.customerName;
    if (!customerName && customerId) {
      const cust = await Customer.findById(customerId).select("customerName");
      if (cust) customerName = cust.customerName;
    }

    // ========== TRANSACTION ==========
    const session = await mongoose.startSession();
    let invoice;

    await session.withTransaction(async (session) => {
      // Generate invoice number
      const now = new Date();
      const financialYear = now.getMonth() >= 3
        ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(-2)}`
        : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(-2)}`;

      const counter = await Counter.findOneAndUpdate(
        { id: "SalesInvoice", companyId: decoded.companyId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true, session }
      );
      invoiceData.invoiceNumber = `SALES-INV/${financialYear}/${String(counter.seq).padStart(5, "0")}`;
      invoiceData.companyId = decoded.companyId;
      invoiceData.createdBy = decoded.id;

      // Create invoice
      [invoice] = await SalesInvoice.create([invoiceData], { session });

      // ===== ✅ CORRECTED: Stock and Sales Order updates =====
      // Only skip stock updates if invoice came from a Delivery Challan
      if (!isFromDelivery) {
        // 1. Reduce physical stock (and committed if from Sales Order)
        for (const item of invoiceData.items) {
          await processItemForInvoice(item, invoice._id, invoice.invoiceNumber, decoded, session, isCopiedSO);
        }

        // 2. If invoice is from a Sales Order, update its invoiced quantities & status
        if (isCopiedSO && invoiceData.salesOrderId) {
          await updateSalesOrderOnInvoice(invoiceData.salesOrderId, invoiceData.items, session, true);
          invoice.sourceId = invoiceData.salesOrderId;
          await invoice.save({ session });
        }
      }
    });

    session.endSession();

    // Accounting entries (outside transaction)
    if (grandTotal > 0 && customerId) {
      try {
        await autoSalesInvoice({
          companyId: decoded.companyId,
          amount: grandTotal,
          partyId: customerId,
          partyName: customerName || "Customer",
          referenceId: invoice._id,
          referenceNumber: invoice.invoiceNumber,
          narration: `Sales Invoice ${invoice.invoiceNumber}`,
          date: invoiceData.invoiceDate || new Date(),
          createdBy: decoded.id,
        });
      } catch (err) { console.error("Sales accounting failed:", err.message); }
    }

    for (const pmt of invoiceData.payments) {
      try {
        let creditAccountName = "Bank Account";
        if (pmt.method === "cash") creditAccountName = "Cash in Hand";
        else if (pmt.method === "bank" && pmt.bankAccountId) {
          const bankAcc = await AccountHead.findById(pmt.bankAccountId);
          if (bankAcc) creditAccountName = bankAcc.name;
        } else if (["upi", "card", "netbanking", "wallet"].includes(pmt.method)) {
          const digitalAcc = await AccountHead.findOne({
            companyId: decoded.companyId,
            name: { $regex: "^Digital Payments$", $options: "i" }
          });
          if (digitalAcc) creditAccountName = digitalAcc.name;
        }
        await autoPaymentReceipt({
          companyId: decoded.companyId,
          amount: pmt.amount,
          partyId: customerId,
          partyName: customerName || "Customer",
          bankAccountName: creditAccountName,
          referenceId: invoice._id,
          referenceNumber: invoice.invoiceNumber,
          narration: `Payment for invoice ${invoice.invoiceNumber} via ${pmt.method}`,
          date: pmt.paymentDate || invoiceData.invoiceDate || new Date(),
          createdBy: decoded.id,
          paymentMode: pmt.method
        });
      } catch (err) { console.error(`Payment entry failed: ${err.message}`); }
    }

    return NextResponse.json({ success: true, message: "Invoice created", data: invoice }, { status: 201 });

  } catch (error) {
    console.error("POST invoice error:", error);
    const status = error.message.toLowerCase().includes("stock") ? 422 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

// --------------------------------------------------------------
// GET – Retrieve invoice(s)
// --------------------------------------------------------------
export async function GET(req) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");

    if (id && Types.ObjectId.isValid(id)) {
      const invoice = await SalesInvoice.findOne({ _id: id, companyId: decoded.companyId })
        .populate("customer", "customerCode customerName")
        .populate("items.item", "itemCode itemName imageUrl variants")
        .populate("items.warehouse", "warehouseName warehouseCode");
      if (!invoice) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: invoice });
    }

    const query = { companyId: decoded.companyId };
    if (status && status !== "All") query.status = status;
    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { invoiceNumber: { $regex: search, $options: "i" } },
        { refNumber: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [invoices, total] = await Promise.all([
      SalesInvoice.find(query)
        .populate("customer", "customerCode customerName")
        .populate("items.item", "itemCode itemName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SalesInvoice.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: invoices,
      meta: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error("GET invoice error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// --------------------------------------------------------------
// PUT – Update invoice (non‑stock fields only)
// --------------------------------------------------------------
export async function PUT(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  let committed = false;

  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized");
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) throw new Error("Invalid token");

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Valid ID required" }, { status: 400 });
    }

    const existing = await SalesInvoice.findOne({ _id: id, companyId: decoded.companyId }).session(session);
    if (!existing) throw new Error("Invoice not found");
    if (existing.status === "Cancelled") throw new Error("Cannot update a cancelled invoice");

    const { fields, files } = await parseMultipart(req);
    const invoiceData = JSON.parse(fields.invoiceData || "{}");

    // Handle attachments
    const removedPublicIds = invoiceData.removedFiles?.map(f => f.publicId) || [];
    const existingFiles = invoiceData.existingFiles || [];
    for (const pubId of removedPublicIds) {
      await cloudinary.uploader.destroy(pubId).catch(e => console.warn(e));
    }
    const newFiles = Array.isArray(files.attachments) ? files.attachments : files.attachments ? [files.attachments] : [];
    const uploadedFiles = [];
    for (const file of newFiles) {
      if (!file?.filepath) continue;
      const result = await cloudinary.uploader.upload(file.filepath, {
        folder: "sales-invoices",
        resource_type: "auto",
      });
      uploadedFiles.push({
        fileName: file.originalFilename,
        fileUrl: result.secure_url,
        fileType: file.mimetype,
        uploadedAt: new Date(),
        publicId: result.public_id,
      });
    }

    // Only allow updates to certain fields (cannot change items, stock, etc.)
    const updatePayload = {
      status: invoiceData.status,
      paymentStatus: invoiceData.paymentStatus,
      paidAmount: invoiceData.paidAmount,
      remainingAmount: invoiceData.remainingAmount,
      payments: invoiceData.payments,
      remarks: invoiceData.remarks,
      dueDate: invoiceData.dueDate,
      attachments: [
        ...existingFiles.filter(f => !removedPublicIds.includes(f.publicId)),
        ...uploadedFiles,
      ],
      updatedAt: new Date(),
    };

    const updated = await SalesInvoice.findByIdAndUpdate(id, updatePayload, { new: true, session });
    await session.commitTransaction();
    committed = true;
    session.endSession();

    return NextResponse.json({ success: true, message: "Invoice updated", data: updated });
  } catch (error) {
    if (session && !committed) await session.abortTransaction();
    if (session) await session.endSession();
    console.error("PUT invoice error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// --------------------------------------------------------------
// DELETE – Cancel invoice (restore stock and revert SO)
// --------------------------------------------------------------
export async function DELETE(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();
  let committed = false;

  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized");
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) throw new Error("Invalid token");

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Valid ID required" }, { status: 400 });
    }

    const invoice = await SalesInvoice.findOne({ _id: id, companyId: decoded.companyId }).session(session);
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status === "Cancelled") throw new Error("Invoice already cancelled");

    // Restore stock (if any was deducted)
    if (invoice.sourceModel !== 'delivery') {
      await restoreStockForInvoice(invoice, decoded, session);
    }

    // Revert Sales Order invoiced quantities and status
    if (invoice.sourceModel === 'salesorder' && invoice.sourceId) {
      await updateSalesOrderOnInvoice(invoice.sourceId, invoice.items, session, false);
    }

    // Mark invoice as cancelled
    invoice.status = "Cancelled";
    await invoice.save({ session });

    // Optional: delete attachments from cloudinary
    if (invoice.attachments?.length) {
      const publicIds = invoice.attachments.map(a => a.publicId).filter(Boolean);
      for (const pubId of publicIds) {
        await cloudinary.uploader.destroy(pubId).catch(e => console.warn(e));
      }
    }

    await session.commitTransaction();
    committed = true;
    session.endSession();

    return NextResponse.json({ success: true, message: "Invoice cancelled, stock restored, SO reverted" });
  } catch (error) {
    if (session && !committed) await session.abortTransaction();
    if (session) await session.endSession();
    console.error("DELETE invoice error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}



// import mongoose from "mongoose";
// import formidable from "formidable";
// import { Readable } from "stream";
// import dbConnect from "@/lib/db";
// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";
// import SalesInvoice from "@/models/SalesInvoice";
// import Customer from "@/models/CustomerModel";
// import Warehouse from "@/models/warehouseModels";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { v2 as cloudinary } from "cloudinary";
// import Counter from "@/models/Counter";

// // ✅ ADD: Auto accounting entry import
// import { autoSalesInvoice } from "@/lib/autoTransaction";

// export const config = { api: { bodyParser: false } };

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const { Types } = mongoose;

// // --- Helpers (unchanged) ---
// async function toNodeReq(request) {
//   const buf = Buffer.from(await request.arrayBuffer());
//   const nodeReq = new Readable({ read() { this.push(buf); this.push(null); } });
//   nodeReq.headers = Object.fromEntries(request.headers.entries());
//   return nodeReq;
// }

// async function parseMultipart(request) {
//   const nodeReq = await toNodeReq(request);
//   const form = formidable({ multiples: true, keepExtensions: true });
//   return new Promise((res, rej) =>
//     form.parse(nodeReq, (err, fields, files) => (err ? rej(err) : res({ fields, files })))
//   );
// }

// async function validateStockAvailability(items) {
//   for (const item of items) {
//     const warehouseDoc = await Warehouse.findById(item.warehouse).lean();
//     if (!warehouseDoc) throw new Error(`Warehouse '${item.warehouseName}' not found.`);

//     const useBins = warehouseDoc.binLocations && warehouseDoc.binLocations.length > 0;
//     const query = { item: new Types.ObjectId(item.item), warehouse: new Types.ObjectId(item.warehouse) };
//     if (useBins) {
//       if (!item.selectedBin?._id) throw new Error(`A bin must be selected for '${item.itemName}'.`);
//       query.bin = new Types.ObjectId(item.selectedBin._id);
//     } else query.bin = { $in: [null, undefined] };

//     const inventoryDoc = await Inventory.findOne(query).lean();
//     const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;

//     if (!inventoryDoc) throw new Error(`Stock Check Failed: No inventory for '${item.itemName}' in ${location}.`);
//     if (inventoryDoc.quantity < item.quantity)
//       throw new Error(`Stock Check Failed: Insufficient stock for '${item.itemName}' in ${location}. Required: ${item.quantity}, Available: ${inventoryDoc.quantity}.`);
//   }
// }

// async function processItemForInvoice(item, session, invoice, decoded, isCopiedSO) {
//   const warehouseDoc = await Warehouse.findById(item.warehouse).session(session).lean();
//   if (!warehouseDoc) throw new Error(`Warehouse '${item.warehouseName}' not found.`);

//   const useBins = warehouseDoc.binLocations && warehouseDoc.binLocations.length > 0;
//   const query = { item: new Types.ObjectId(item.item), warehouse: new Types.ObjectId(item.warehouse) };
//   let binId = null;

//   if (useBins) {
//     binId = new Types.ObjectId(item.selectedBin._id);
//     query.bin = binId;
//   } else query.bin = { $in: [null, undefined] };

//   const inventoryDoc = await Inventory.findOne(query).session(session);
//   if (!inventoryDoc) {
//     const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;
//     throw new Error(`Transaction failed: Inventory record for '${item.itemName}' in ${location} disappeared.`);
//   }

//   if (inventoryDoc.quantity < item.quantity) {
//     const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;
//     throw new Error(`Transaction failed: Insufficient stock for '${item.itemName}' in ${location}.`);
//   }

//   inventoryDoc.quantity -= item.quantity;
//   if (isCopiedSO) inventoryDoc.committed = Math.max(0, (inventoryDoc.committed || 0) - item.quantity);

//   await StockMovement.create([{
//     item: item.item,
//     warehouse: item.warehouse,
//     bin: binId,
//     movementType: "OUT",
//     quantity: item.quantity,
//     reference: invoice._id,
//     referenceType: 'SalesInvoice',
//     documentNumber: invoice.invoiceNumber,
//     remarks: isCopiedSO ? "Invoice from SO" : "Direct Invoice",
//     companyId: decoded.companyId,
//   }], { session });

//   await inventoryDoc.save({ session });
// }

// // --- POST Handler ---
// export async function POST(req) {
//   await dbConnect();

//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) throw new Error("Unauthorized: No token provided");
//     const user = verifyJWT(token);
//     if (!user?.companyId) throw new Error("Invalid token payload");

//     const { fields, files } = await parseMultipart(req);
//     const invoiceData = JSON.parse(fields.invoiceData || "{}");
//     const isFromDelivery = invoiceData.sourceModel?.toLowerCase() === 'delivery';

//     // 1. Validate stock before transaction
//     if (!isFromDelivery) await validateStockAvailability(invoiceData.items);

//     // 2. Upload files outside transaction (unchanged)
//     const newFiles = Array.isArray(files.newAttachments)
//       ? files.newAttachments
//       : files.newAttachments ? [files.newAttachments] : [];
//     const uploadedFiles = await Promise.all(
//       newFiles.map(async (file) => {
//         const result = await cloudinary.uploader.upload(file.filepath, { folder: "invoices", resource_type: "auto" });
//         return { fileName: file.originalFilename, fileUrl: result.secure_url, fileType: file.mimetype, publicId: result.public_id, uploadedAt: new Date() };
//       })
//     );
//     invoiceData.attachments = [...(invoiceData.attachments || []), ...uploadedFiles];

//     // 3. DB transaction
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       const now = new Date();
//       const financialYear = now.getMonth() >= 3
//         ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(-2)}`
//         : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(-2)}`;

//       const counterDoc = await Counter.findOneAndUpdate(
//         { id: "SalesInvoice", companyId: user.companyId },
//         { $inc: { seq: 1 } },
//         { new: true, upsert: true, session }
//       );

//       invoiceData.invoiceNumber = `SALES-INV/${financialYear}/${String(counterDoc.seq).padStart(5, "0")}`;
//       invoiceData.companyId = user.companyId;

//       const [invoice] = await SalesInvoice.create([invoiceData], { session });

//       // Deduct stock
//       if (!isFromDelivery) {
//         const isCopiedSO = invoiceData.sourceModel?.toLowerCase() === 'salesorder';
//         for (const item of invoiceData.items) {
//           await processItemForInvoice(item, session, invoice, user, isCopiedSO);
//         }
//       }

//       await session.commitTransaction();
//       session.endSession();

//       // ✅ AUTO ACCOUNTING ENTRY (after commit)
//       try {
//         // --- FIX: Extract customer ID correctly ---
//         let customerId = null;
//         let customerName = invoiceData.customerName || "Customer";

//         if (invoiceData.customer) {
//           // customer can be an object with _id, or just a string ID
//           if (typeof invoiceData.customer === 'object' && invoiceData.customer._id) {
//             customerId = invoiceData.customer._id;
//             customerName = invoiceData.customer.name || customerName;
//           } else if (typeof invoiceData.customer === 'string') {
//             customerId = invoiceData.customer;
//           }
//         } else if (invoiceData.customerId) {
//           customerId = invoiceData.customerId;
//         }

//         // Also allow customerName from separate field
//         if (invoiceData.customerName) customerName = invoiceData.customerName;
//         else if (customerId) {
//           // Optionally fetch name from Customer model if needed
//           const cust = await Customer.findById(customerId).select("customerName");
//           if (cust) customerName = cust.customerName;
//         }

//         // Determine total amount
//         const totalAmount = invoiceData.grandTotal
//           || invoiceData.totalAmount
//           || invoiceData.total
//           || 0;

//         if (totalAmount <= 0) {
//           console.warn(`⚠️ Skipping accounting entry for invoice ${invoice.invoiceNumber}: amount is zero`);
//         } else if (!customerId) {
//           console.warn(`⚠️ Skipping accounting entry for invoice ${invoice.invoiceNumber}: missing customer ID`);
//         } else {
//           await autoSalesInvoice({
//             companyId:       user.companyId,
//             amount:          totalAmount,
//             partyId:         customerId,
//             partyName:       customerName,
//             referenceId:     invoice._id,
//             referenceNumber: invoice.invoiceNumber,
//             narration:       `Sales Invoice ${invoice.invoiceNumber} — ${customerName}`,
//             date:            invoice.postingDate,
//             createdBy:       user.id,
//           });
//           console.log(`✅ Accounting entry created for invoice ${invoice.invoiceNumber}`);
//         }
//       } catch (accountingErr) {
//         // Accounting error does NOT rollback the invoice
//         console.error(`⚠️ Accounting entry failed for invoice ${invoice.invoiceNumber}:`, accountingErr.message);
//         // Optionally store the error in a separate log collection
//       }

//       return new Response(
//         JSON.stringify({ success: true, message: "Invoice created successfully", invoiceId: invoice._id }),
//         { status: 201, headers: { "Content-Type": "application/json" } }
//       );

//     } catch (error) {
//       if (session.inTransaction()) await session.abortTransaction();
//       session.endSession();
//       throw error;
//     }

//   } catch (error) {
//     console.error("Error creating Invoice:", error);
//     return new Response(
//       JSON.stringify({ success: false, message: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }

// // --- GET Handler (unchanged, but works) ---
// export async function GET(req) {
//   try {
//     await dbConnect();

//     const token = getTokenFromHeader(req);
//     if (!token)
//       return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });

//     const user = verifyJWT(token);
//     if (!user)
//       return new Response(JSON.stringify({ message: "Invalid token" }), { status: 403 });

//     const { searchParams } = new URL(req.url);
//     const customerCode = searchParams.get("customerCode");

//     const query = { companyId: user.companyId };
//     if (customerCode) query.customerCode = customerCode;

//     const invoices = await SalesInvoice.find(query)
//       .populate("customer")
//       .sort({ createdAt: -1 });

//     return new Response(JSON.stringify({ success: true, data: invoices }), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });

//   } catch (error) {
//     console.error("SalesInvoice GET error:", error);
//     return new Response(
//       JSON.stringify({ message: "Error fetching invoices", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }




// import mongoose from "mongoose";
// import formidable from "formidable";
// import { Readable } from "stream";
// import dbConnect from "@/lib/db";
// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";
// import SalesInvoice from "@/models/SalesInvoice";
// import Customer from "@/models/CustomerModel";
// import Warehouse from "@/models/warehouseModels";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { v2 as cloudinary } from "cloudinary";
// import Counter from "@/models/Counter";

// // ✅ ADD: Auto accounting entry import
// import { autoSalesInvoice } from "@/lib/autoTransaction";

// export const config = { api: { bodyParser: false } };

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const { Types } = mongoose;

// // --- Helpers --- (unchanged)
// async function toNodeReq(request) {
//   const buf = Buffer.from(await request.arrayBuffer());
//   const nodeReq = new Readable({ read() { this.push(buf); this.push(null); } });
//   nodeReq.headers = Object.fromEntries(request.headers.entries());
//   return nodeReq;
// }

// async function parseMultipart(request) {
//   const nodeReq = await toNodeReq(request);
//   const form = formidable({ multiples: true, keepExtensions: true });
//   return new Promise((res, rej) =>
//     form.parse(nodeReq, (err, fields, files) => (err ? rej(err) : res({ fields, files })))
//   );
// }

// async function validateStockAvailability(items) {
//   for (const item of items) {
//     const warehouseDoc = await Warehouse.findById(item.warehouse).lean();
//     if (!warehouseDoc) throw new Error(`Warehouse '${item.warehouseName}' not found.`);

//     const useBins = warehouseDoc.binLocations && warehouseDoc.binLocations.length > 0;
//     const query = { item: new Types.ObjectId(item.item), warehouse: new Types.ObjectId(item.warehouse) };
//     if (useBins) {
//       if (!item.selectedBin?._id) throw new Error(`A bin must be selected for '${item.itemName}'.`);
//       query.bin = new Types.ObjectId(item.selectedBin._id);
//     } else query.bin = { $in: [null, undefined] };

//     const inventoryDoc = await Inventory.findOne(query).lean();
//     const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;

//     if (!inventoryDoc) throw new Error(`Stock Check Failed: No inventory for '${item.itemName}' in ${location}.`);
//     if (inventoryDoc.quantity < item.quantity)
//       throw new Error(`Stock Check Failed: Insufficient stock for '${item.itemName}' in ${location}. Required: ${item.quantity}, Available: ${inventoryDoc.quantity}.`);
//   }
// }

// async function processItemForInvoice(item, session, invoice, decoded, isCopiedSO) {
//   const warehouseDoc = await Warehouse.findById(item.warehouse).session(session).lean();
//   if (!warehouseDoc) throw new Error(`Warehouse '${item.warehouseName}' not found.`);

//   const useBins = warehouseDoc.binLocations && warehouseDoc.binLocations.length > 0;
//   const query = { item: new Types.ObjectId(item.item), warehouse: new Types.ObjectId(item.warehouse) };
//   let binId = null;

//   if (useBins) {
//     binId = new Types.ObjectId(item.selectedBin._id);
//     query.bin = binId;
//   } else query.bin = { $in: [null, undefined] };

//   const inventoryDoc = await Inventory.findOne(query).session(session);
//   if (!inventoryDoc) {
//     const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;
//     throw new Error(`Transaction failed: Inventory record for '${item.itemName}' in ${location} disappeared.`);
//   }

//   if (inventoryDoc.quantity < item.quantity) {
//     const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;
//     throw new Error(`Transaction failed: Insufficient stock for '${item.itemName}' in ${location}.`);
//   }

//   inventoryDoc.quantity -= item.quantity;
//   if (isCopiedSO) inventoryDoc.committed = Math.max(0, (inventoryDoc.committed || 0) - item.quantity);

//   await StockMovement.create([{
//     item: item.item,
//     warehouse: item.warehouse,
//     bin: binId,
//     movementType: "OUT",
//     quantity: item.quantity,
//     reference: invoice._id,
//     referenceType: 'SalesInvoice',
//     documentNumber: invoice.invoiceNumber,
//     remarks: isCopiedSO ? "Invoice from SO" : "Direct Invoice",
//     companyId: decoded.companyId,
//   }], { session });

//   await inventoryDoc.save({ session });
// }

// // --- POST Handler ---
// export async function POST(req) {
//   await dbConnect();

//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) throw new Error("Unauthorized: No token provided");
//     const user = verifyJWT(token);
//     if (!user?.companyId) throw new Error("Invalid token payload");

//     const { fields, files } = await parseMultipart(req);
//     const invoiceData = JSON.parse(fields.invoiceData || "{}");
//     const isFromDelivery = invoiceData.sourceModel?.toLowerCase() === 'delivery';

//     // 1. Validate stock before transaction
//     if (!isFromDelivery) await validateStockAvailability(invoiceData.items);

//     // 2. Upload files outside transaction (unchanged)
//     const newFiles = Array.isArray(files.newAttachments)
//       ? files.newAttachments
//       : files.newAttachments ? [files.newAttachments] : [];
//     const uploadedFiles = await Promise.all(
//       newFiles.map(async (file) => {
//         const result = await cloudinary.uploader.upload(file.filepath, { folder: "invoices", resource_type: "auto" });
//         return { fileName: file.originalFilename, fileUrl: result.secure_url, fileType: file.mimetype, publicId: result.public_id, uploadedAt: new Date() };
//       })
//     );
//     invoiceData.attachments = [...(invoiceData.attachments || []), ...uploadedFiles];

//     // 3. DB transaction
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       const now = new Date();
//       const financialYear = now.getMonth() >= 3
//         ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(-2)}`
//         : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(-2)}`;

//       const counterDoc = await Counter.findOneAndUpdate(
//         { id: "SalesInvoice", companyId: user.companyId },
//         { $inc: { seq: 1 } },
//         { new: true, upsert: true, session }
//       );

//       invoiceData.invoiceNumber = `SALES-INV/${financialYear}/${String(counterDoc.seq).padStart(5, "0")}`;
//       invoiceData.companyId = user.companyId;

//       const [invoice] = await SalesInvoice.create([invoiceData], { session });

//       // Deduct stock
//       if (!isFromDelivery) {
//         const isCopiedSO = invoiceData.sourceModel?.toLowerCase() === 'salesorder';
//         for (const item of invoiceData.items) {
//           await processItemForInvoice(item, session, invoice, user, isCopiedSO);
//         }
//       }

//       await session.commitTransaction();
//       session.endSession();

//       // ✅ AUTO ACCOUNTING ENTRY
//       // Yahan add kiya — commitTransaction ke BAAD, session.endSession ke BAAD
//       // Reason: Accounting entry apna alag transaction use karti hai (autoTransaction.js ke andar)
//       // Agar invoice session ke andar daalo toh conflict hoga
//       // Agar invoice fail ho toh accounting entry bhi nahi hogi (kyunki commit ke baad hi aata hai)
//       try {
//         // Customer ka naam aur ID invoiceData se nikalna
//         const customerName = invoiceData.customerName
//           || invoiceData.customer?.name
//           || "Customer";

//         const customerId = invoiceData.customer
//           || invoiceData.customerId
//           || null;

//         await autoSalesInvoice({
//           companyId:       user.companyId,
//           amount:          invoiceData.grandTotal      // tumhara invoice total field
//                         || invoiceData.totalAmount
//                         || invoiceData.total
//                         || 0,
//           partyId:         customerId,
//           partyName:       customerName,
//           referenceId:     invoice._id,
//           referenceNumber: invoice.invoiceNumber,
//           narration:       `Sales Invoice ${invoice.invoiceNumber} — ${customerName}`,
//           date:            invoice.invoiceDate || new Date(),
//           createdBy:       user.id,
//         });
//       } catch (accountingErr) {
//         // ✅ Accounting error se invoice fail NAHI hoga
//         // Sirf log karo — baad mein manually post kar sakte hain
//         console.error(
//           `⚠️ Accounting entry failed for invoice ${invoice.invoiceNumber}:`,
//           accountingErr.message
//         );
//       }

//       return new Response(
//         JSON.stringify({ success: true, message: "Invoice created successfully", invoiceId: invoice._id }),
//         { status: 201, headers: { "Content-Type": "application/json" } }
//       );

//     } catch (error) {
//       if (session.inTransaction()) await session.abortTransaction();
//       session.endSession();
//       throw error;
//     }

//   } catch (error) {
//     console.error("Error creating Invoice:", error);
//     return new Response(
//       JSON.stringify({ success: false, message: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }


// export async function GET(req) {
//   try {
//     await dbConnect();

//     const token = getTokenFromHeader(req);
//     if (!token)
//       return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });

//     const user = verifyJWT(token);
//     if (!user)
//       return new Response(JSON.stringify({ message: "Invalid token" }), { status: 403 });

//     const { searchParams } = new URL(req.url);
//     const customerCode = searchParams.get("customerCode");

//     const query = { companyId: user.companyId };
//     if (customerCode) query.customerCode = customerCode;

//     const invoices = await SalesInvoice.find(query)
//       .populate("customer")
//       .sort({ createdAt: -1 });

//     return new Response(JSON.stringify({ success: true, data: invoices }), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });

//   } catch (error) {
//     console.error("SalesInvoice GET error:", error);
//     return new Response(
//       JSON.stringify({ message: "Error fetching invoices", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }




// import mongoose from "mongoose";
// import formidable from "formidable";
// import { Readable } from "stream";
// import dbConnect from "@/lib/db";
// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";
// import SalesInvoice from "@/models/SalesInvoice";
// import Customer from "@/models/CustomerModel";
// import Warehouse from "@/models/warehouseModels";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { v2 as cloudinary } from "cloudinary";
// import Counter from "@/models/Counter";

// export const config = { api: { bodyParser: false } };

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const { Types } = mongoose;

// // --- Helpers ---
// async function toNodeReq(request) {
//   const buf = Buffer.from(await request.arrayBuffer());
//   const nodeReq = new Readable({ read() { this.push(buf); this.push(null); } });
//   nodeReq.headers = Object.fromEntries(request.headers.entries());
//   return nodeReq;
// }

// async function parseMultipart(request) {
//   const nodeReq = await toNodeReq(request);
//   const form = formidable({ multiples: true, keepExtensions: true });
//   return new Promise((res, rej) =>
//     form.parse(nodeReq, (err, fields, files) => (err ? rej(err) : res({ fields, files })))
//   );
// }

// async function validateStockAvailability(items) {
//   for (const item of items) {
//     const warehouseDoc = await Warehouse.findById(item.warehouse).lean();
//     if (!warehouseDoc) throw new Error(`Warehouse '${item.warehouseName}' not found.`);

//     const useBins = warehouseDoc.binLocations && warehouseDoc.binLocations.length > 0;
//     const query = { item: new Types.ObjectId(item.item), warehouse: new Types.ObjectId(item.warehouse) };
//     if (useBins) {
//       if (!item.selectedBin?._id) throw new Error(`A bin must be selected for '${item.itemName}'.`);
//       query.bin = new Types.ObjectId(item.selectedBin._id);
//     } else query.bin = { $in: [null, undefined] };

//     const inventoryDoc = await Inventory.findOne(query).lean();
//     const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;

//     if (!inventoryDoc) throw new Error(`Stock Check Failed: No inventory for '${item.itemName}' in ${location}.`);
//     if (inventoryDoc.quantity < item.quantity)
//       throw new Error(`Stock Check Failed: Insufficient stock for '${item.itemName}' in ${location}. Required: ${item.quantity}, Available: ${inventoryDoc.quantity}.`);
//   }
// }

// async function processItemForInvoice(item, session, invoice, decoded, isCopiedSO) {
//   const warehouseDoc = await Warehouse.findById(item.warehouse).session(session).lean();
//   if (!warehouseDoc) throw new Error(`Warehouse '${item.warehouseName}' not found.`);

//   const useBins = warehouseDoc.binLocations && warehouseDoc.binLocations.length > 0;
//   const query = { item: new Types.ObjectId(item.item), warehouse: new Types.ObjectId(item.warehouse) };
//   let binId = null;

//   if (useBins) {
//     binId = new Types.ObjectId(item.selectedBin._id);
//     query.bin = binId;
//   } else query.bin = { $in: [null, undefined] };

//   const inventoryDoc = await Inventory.findOne(query).session(session);
//   if (!inventoryDoc) {
//     const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;
//     throw new Error(`Transaction failed: Inventory record for '${item.itemName}' in ${location} disappeared.`);
//   }

//   if (inventoryDoc.quantity < item.quantity) {
//     const location = useBins ? `bin '${item.selectedBin.code}'` : `warehouse '${item.warehouseName}'`;
//     throw new Error(`Transaction failed: Insufficient stock for '${item.itemName}' in ${location}.`);
//   }

//   inventoryDoc.quantity -= item.quantity;
//   if (isCopiedSO) inventoryDoc.committed = Math.max(0, (inventoryDoc.committed || 0) - item.quantity);

//   await StockMovement.create([{
//     item: item.item,
//     warehouse: item.warehouse,
//     bin: binId,
//     movementType: "OUT",
//     quantity: item.quantity,
//     reference: invoice._id,
//     referenceType: 'SalesInvoice',
//     documentNumber: invoice.invoiceNumber,
//     remarks: isCopiedSO ? "Invoice from SO" : "Direct Invoice",
//     companyId: decoded.companyId,
//   }], { session });

//   await inventoryDoc.save({ session });
// }

// // --- API Handler ---
// export async function POST(req) {
//   await dbConnect();

//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) throw new Error("Unauthorized: No token provided");
//     const user = verifyJWT(token);
//     if (!user?.companyId) throw new Error("Invalid token payload");

//     const { fields, files } = await parseMultipart(req);
//     const invoiceData = JSON.parse(fields.invoiceData || "{}");
//     const isFromDelivery = invoiceData.sourceModel?.toLowerCase() === 'delivery';

//     // 1. Validate stock before transaction
//     if (!isFromDelivery) await validateStockAvailability(invoiceData.items);

//     // 2. Upload files **outside transaction**
//     const newFiles = Array.isArray(files.newAttachments)
//       ? files.newAttachments
//       : files.newAttachments ? [files.newAttachments] : [];
//     const uploadedFiles = await Promise.all(
//       newFiles.map(async (file) => {
//         const result = await cloudinary.uploader.upload(file.filepath, { folder: "invoices", resource_type: "auto" });
//         return { fileName: file.originalFilename, fileUrl: result.secure_url, fileType: file.mimetype, publicId: result.public_id, uploadedAt: new Date() };
//       })
//     );
//     invoiceData.attachments = [...(invoiceData.attachments || []), ...uploadedFiles];

//     // 3. Start transaction for DB operations only
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//       const now = new Date();
//       const financialYear = now.getMonth() >= 3
//         ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(-2)}`
//         : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(-2)}`;

//       // --- Generate invoice number atomically using Counter only ---
//       const counterDoc = await Counter.findOneAndUpdate(
//         { id: "SalesInvoice", companyId: user.companyId },
//         { $inc: { seq: 1 } },
//         { new: true, upsert: true, session }
//       );

//       invoiceData.invoiceNumber = `SALES-INV/${financialYear}/${String(counterDoc.seq).padStart(5, "0")}`;
//       invoiceData.companyId = user.companyId;

//       const [invoice] = await SalesInvoice.create([invoiceData], { session });

//       // Deduct stock
//       if (!isFromDelivery) {
//         const isCopiedSO = invoiceData.sourceModel?.toLowerCase() === 'salesorder';
//         for (const item of invoiceData.items) {
//           await processItemForInvoice(item, session, invoice, user, isCopiedSO);
//         }
//       }

//       await session.commitTransaction();
//       session.endSession();

//       return new Response(
//         JSON.stringify({ success: true, message: "Invoice created successfully", invoiceId: invoice._id }),
//         { status: 201, headers: { "Content-Type": "application/json" } }
//       );

//     } catch (error) {
//       if (session.inTransaction()) await session.abortTransaction();
//       session.endSession();
//       throw error;
//     }

//   } catch (error) {
//     console.error("Error creating Invoice:", error);
//     return new Response(
//       JSON.stringify({ success: false, message: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }


// export async function GET(req) {
//   try {
//     await dbConnect();

//     // ✅ Authenticate request
//     const token = getTokenFromHeader(req);
//     if (!token)
//       return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });

//     const user = verifyJWT(token);
//     if (!user)
//       return new Response(JSON.stringify({ message: "Invalid token" }), { status: 403 });

//     // ✅ Parse query params
//     const { searchParams } = new URL(req.url);
//     const customerCode = searchParams.get("customerCode");

//     // ✅ Build secure query scoped to user's company
//     const query = { companyId: user.companyId };
//     if (customerCode) {
//       query.customerCode = customerCode;
//     }

//     // ✅ Fetch and populate
//     const invoices = await SalesInvoice.find(query)
//       .populate("customer") // Assuming 'customer' is a valid ref field in schema
//       .sort({ createdAt: -1 });

//     return new Response(JSON.stringify({ success: true, data: invoices }), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });

//   } catch (error) {
//     console.error("SalesInvoice GET error:", error);
//     return new Response(
//       JSON.stringify({ message: "Error fetching invoices", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }

