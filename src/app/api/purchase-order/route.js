import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import PurchaseOrder from "@/models/PurchaseOrder";
import SalesOrder from "@/models/SalesOrder";
import PurchaseQuotation from "@/models/PurchaseQuotationModel";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";
import Counter from "@/models/Counter";
import Supplier from "@/models/SupplierModels";
import ItemModels from "@/models/ItemModels";


export const config = { api: { bodyParser: false } };

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ POST - Create Purchase Order
export async function POST(req) {
  await dbConnect();
  
  try {
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded?.companyId) {
      return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 401 });
    }

    const formData = await req.formData();
    const rawData = formData.get("orderData");
    if (!rawData) {
      return NextResponse.json({ success: false, error: "Missing order data" }, { status: 400 });
    }

    let orderData;
    try {
      orderData = JSON.parse(rawData);
    } catch (err) {
      return NextResponse.json({ success: false, error: "Invalid JSON in orderData" }, { status: 400 });
    }

    // Clean + add required fields
    delete orderData._id;
    orderData.companyId = decoded.companyId;
    orderData.createdBy = decoded.id;
    orderData.orderStatus = orderData.orderStatus || "Open";

    // Handle file uploads
    const files = formData.getAll("attachments");
    const uploadedFiles = [];
    for (const file of files) {
      if (file && file.size > 0) {
        try {
          const buffer = await file.arrayBuffer();
          const uploadRes = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { folder: "purchase-orders", resource_type: "auto" },
              (err, result) => (err ? reject(err) : resolve(result))
            );
            stream.end(Buffer.from(buffer));
          });
          uploadedFiles.push({
            fileName: file.name,
            fileType: file.type,
            fileUrl: uploadRes.secure_url,
            cloudinaryId: uploadRes.public_id,
            uploadedAt: new Date(),
          });
        } catch (uploadErr) {
          console.error("File upload error:", uploadErr);
        }
      }
    }

    const existingFiles = orderData.existingFiles || [];
    const removedFiles = orderData.removedFiles || [];
    orderData.attachments = [
      ...existingFiles.filter((f) => !removedFiles.some((r) => r.cloudinaryId === f.cloudinaryId)),
      ...uploadedFiles,
    ];
    delete orderData.existingFiles;
    delete orderData.removedFiles;

    // Validate items have warehouse
    if (orderData.items.some(item => !item.warehouse)) {
      return NextResponse.json({ 
        success: false, 
        error: "All items must have a warehouse assigned" 
      }, { status: 422 });
    }

    // Link to Purchase Quotation if provided
    if (orderData.sourcePurchaseQuotationId || orderData.purchasequotation) {
      const pqId = orderData.sourcePurchaseQuotationId || orderData.purchasequotation;
      const pq = await PurchaseQuotation.findById(pqId);
      if (pq) {
        orderData.supplier = orderData.supplier || pq.supplier;
        if (!orderData.items || orderData.items.length === 0) {
          orderData.items = pq.items;
        }
        await PurchaseQuotation.updateOne({ _id: pq._id }, { status: "ConvertedToOrder" });
      }
    }

    // Generate document number
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    let fyStart = currentYear, fyEnd = currentYear + 1;
    if (currentMonth < 4) {
      fyStart = currentYear - 1;
      fyEnd = currentYear;
    }
    const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
    const key = `PurchaseOrder_${decoded.companyId}`;

    let counter, retries = 3;
    while (retries > 0) {
      try {
        counter = await Counter.findOneAndUpdate(
          { id: key, companyId: decoded.companyId },
          { $inc: { seq: 1 } },
          { new: true, upsert: true }
        );
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    const paddedSeq = String(counter.seq).padStart(5, "0");
    const documentNumberPurchaseOrder = `PURCH-ORD/${financialYear}/${paddedSeq}`;
    orderData.documentNumberPurchaseOrder = documentNumberPurchaseOrder;

    // Create Purchase Order
    const purchaseOrder = await PurchaseOrder.create([orderData]);
    const createdOrder = purchaseOrder[0];

    // Update linked Sales Orders
    if (Array.isArray(orderData.salesOrder) && orderData.salesOrder.length > 0) {
      await SalesOrder.updateMany(
        { _id: { $in: orderData.salesOrder }, companyId: decoded.companyId },
        { $set: { linkedPurchaseOrder: createdOrder._id, status: "LinkedToPurchaseOrder" } }
      );
    }

    // ✅ Update Inventory + StockMovement (only increase onOrder, NOT physical stock)
    for (const item of createdOrder.items) {
      if (!item.item || !item.quantity) continue;

      // Find or create inventory record
      let inventory = await Inventory.findOne({
        companyId: decoded.companyId,
        item: item.item,
        warehouse: item.warehouse
      });

      if (!inventory) {
        inventory = new Inventory({
          companyId: decoded.companyId,
          item: item.item,
          warehouse: item.warehouse,
          hasVariants: false,
        });
        await inventory.save();
      }

      const variantId = item.variant?.variantId || item.selectedVariantId;

      if (variantId) {
        // Ensure hasVariants flag is true
        if (!inventory.hasVariants) inventory.hasVariants = true;

        // Find existing variant inventory or create a placeholder
        let variantInv = inventory.variantInventory.find(v => v.variantId.toString() === variantId.toString());
        if (!variantInv) {
          variantInv = {
            variantId,
            sku: item.itemCode,
            attributes: item.variant?.attributes || {},
            quantity: 0,       // physical stock remains zero
            committed: 0,
            onOrder: 0,
            batches: []
          };
          inventory.variantInventory.push(variantInv);
        }

        // 🔹 ONLY increase onOrder – NOT quantity
        variantInv.onOrder = (variantInv.onOrder || 0) + item.quantity;
        await inventory.save();
      } else {
        // Non‑variant item: only increase onOrder
        inventory.onOrder = (inventory.onOrder || 0) + item.quantity;
        await inventory.save();
      }

      // Update stock status (based on quantity, not onOrder)
      await inventory.updateStockStatus();

      // Create StockMovement entry for ON_ORDER
      await StockMovement.create({
        companyId: decoded.companyId,
        createdBy: decoded.id,
        item: item.item,
        variantId: variantId || null,
        warehouse: item.warehouse,
        movementType: "ON_ORDER",
        quantity: item.quantity,
        reference: createdOrder._id,
        referenceModel: "PurchaseOrder",
        remarks: `Stock ordered via PO ${createdOrder.documentNumberPurchaseOrder}`,
        date: new Date()
      });
    }

    // Populate response
    const populatedOrder = await PurchaseOrder.findById(createdOrder._id)
      .populate("supplier", "supplierName supplierCode contactPerson")
      .populate("items.item", "itemCode itemName unitPrice imageUrl variants");

    return NextResponse.json(
      { success: true, message: "Purchase Order created successfully", data: populatedOrder },
      { status: 201 }
    );
  } catch (error) {
    console.error("Purchase Order Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ✅ GET - Fetch Purchase Orders (supports variants)
export async function GET(req) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const status = searchParams.get("status");
    const supplier = searchParams.get("supplier");
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";

    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
      }
      const order = await PurchaseOrder.findOne({ _id: id, companyId: decoded.companyId })
        .populate("supplier", "supplierName supplierCode contactPerson")
        .populate("items.item", "itemCode itemName unitPrice imageUrl variants");
      if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: order });
    }

    const query = { companyId: decoded.companyId };
    if (status) query.orderStatus = status;
    if (supplier && mongoose.Types.ObjectId.isValid(supplier)) query.supplier = supplier;
    if (search) {
      query.$or = [
        { documentNumberPurchaseOrder: { $regex: search, $options: "i" } },
        { supplierName: { $regex: search, $options: "i" } },
        { refNumber: { $regex: search, $options: "i" } }
      ];
    }

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      PurchaseOrder.find(query)
        .populate("supplier", "supplierName supplierCode contactPerson")
        .populate("items.item", "itemCode itemName unitPrice imageUrl")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PurchaseOrder.countDocuments(query)
    ]);

    return NextResponse.json({ 
      success: true, 
      data: orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error("GET /api/purchase-order error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ✅ PUT - Update Purchase Order (supports variants)
export async function PUT(req) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Valid ID required" }, { status: 400 });
    }

    const formData = await req.formData();
    const rawData = formData.get("orderData");
    let orderData;
    try {
      orderData = JSON.parse(rawData);
    } catch (err) {
      return NextResponse.json({ success: false, error: "Invalid JSON in orderData" }, { status: 400 });
    }

    // File handling
    const files = formData.getAll("attachments");
    const uploadedFiles = [];
    for (const file of files) {
      if (file && file.size > 0) {
        const buffer = await file.arrayBuffer();
        const uploadRes = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "purchase-orders", resource_type: "auto" },
            (err, result) => (err ? reject(err) : resolve(result))
          );
          stream.end(Buffer.from(buffer));
        });
        uploadedFiles.push({
          fileName: file.name,
          fileType: file.type,
          fileUrl: uploadRes.secure_url,
          cloudinaryId: uploadRes.public_id,
          uploadedAt: new Date(),
        });
      }
    }

    const existingFiles = orderData.existingFiles || [];
    const removedFiles = orderData.removedFiles || [];
    for (const file of removedFiles) {
      if (file.cloudinaryId) await cloudinary.uploader.destroy(file.cloudinaryId).catch(e => console.warn(e));
    }
    orderData.attachments = [
      ...existingFiles.filter(f => !removedFiles.some(r => r.cloudinaryId === f.cloudinaryId)),
      ...uploadedFiles,
    ];
    delete orderData.existingFiles;
    delete orderData.removedFiles;
    delete orderData._id;

    const updatedOrder = await PurchaseOrder.findOneAndUpdate(
      { _id: id, companyId: decoded.companyId },
      { ...orderData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate("supplier", "supplierName supplierCode contactPerson")
      .populate("items.item", "itemCode itemName unitPrice imageUrl variants");

    if (!updatedOrder) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Purchase Order updated successfully", data: updatedOrder });
  } catch (error) {
    console.error("PUT /api/purchase-order error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ✅ DELETE - Delete Purchase Order
export async function DELETE(req) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Valid ID required" }, { status: 400 });
    }

    const order = await PurchaseOrder.findOne({ _id: id, companyId: decoded.companyId });
    if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });

    if (order.attachments?.length) {
      for (const file of order.attachments) {
        if (file.cloudinaryId) await cloudinary.uploader.destroy(file.cloudinaryId).catch(e => console.warn(e));
      }
    }
    await PurchaseOrder.deleteOne({ _id: id, companyId: decoded.companyId });
    return NextResponse.json({ success: true, message: "Purchase Order deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/purchase-order error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// import { NextResponse } from "next/server";
// import mongoose from "mongoose";
// import dbConnect from "@/lib/db";
// import PurchaseOrder from "@/models/PurchaseOrder";
// import SalesOrder from "@/models/SalesOrder";
// import PurchaseQuotation from "@/models/PurchaseQuotationModel";
// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { v2 as cloudinary } from "cloudinary";
// import Supplier from "@/models/SupplierModels";
// import ItemModels from "@/models/ItemModels";
// import Counter from "@/models/Counter";

// export const config = { api: { bodyParser: false } };

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // ✅ POST: Create Purchase Order
// export async function POST(req) {
//   await dbConnect();
//   const session = await mongoose.startSession();

//   try {
//     const token = getTokenFromHeader(req);
//     if (!token) {
//       return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
//     }

//     const decoded = verifyJWT(token);
//     if (!decoded?.companyId) {
//       return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 401 });
//     }

//     const formData = await req.formData();
//     const rawData = formData.get("orderData");
//     if (!rawData) {
//       return NextResponse.json({ success: false, error: "Missing order data" }, { status: 400 });
//     }

//     let orderData;
//     try {
//       orderData = JSON.parse(rawData);
//     } catch (err) {
//       return NextResponse.json({ success: false, error: "Invalid JSON in orderData" }, { status: 400 });
//     }

//     // Clean + add required fields
//     delete orderData._id;
//     orderData.companyId = decoded.companyId;
//     orderData.createdBy = decoded.id;
//     orderData.orderStatus = "Open";

//     // ✅ Handle file uploads
//     const files = formData.getAll("attachments");
//     const uploadedFiles = [];

//     for (const file of files) {
//       const buffer = await file.arrayBuffer();
//       const uploadRes = await new Promise((resolve, reject) => {
//         const stream = cloudinary.uploader.upload_stream(
//           { folder: "purchase-orders", resource_type: "auto" },
//           (err, result) => (err ? reject(err) : resolve(result))
//         );
//         stream.end(Buffer.from(buffer));
//       });
//       uploadedFiles.push({
//         fileName: file.name,
//         fileType: file.type,
//         fileUrl: uploadRes.secure_url,
//         cloudinaryId: uploadRes.public_id,
//       });
//     }

//     const existingFiles = orderData.existingFiles || [];
//     const removedFiles = orderData.removedFiles || [];
//     orderData.attachments = [
//       ...existingFiles.filter((f) => !removedFiles.some((r) => r.cloudinaryId === f.cloudinaryId)),
//       ...uploadedFiles,
//     ];

//     // ✅ If linked to Purchase Quotation
//     if (orderData.sourcePurchaseQuotationId) {
//       const pq = await PurchaseQuotation.findById(orderData.sourcePurchaseQuotationId);
//       if (pq) {
//         orderData.supplier = orderData.supplier || pq.supplier;
//         orderData.items = orderData.items?.length ? orderData.items : pq.items;
//         await PurchaseQuotation.updateOne({ _id: pq._id }, { status: "ConvertedToOrder" });
//       }
//     }

//     // ✅ Validate items
//     if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
//       return NextResponse.json({ success: false, error: "At least one item is required" }, { status: 422 });
//     }

//     // ✅ Transaction starts
//     session.startTransaction();

//     // Generate Financial Year based Document Number
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
//     const key = `PurchaseOrder`;

//     // Safe Counter Increment
//     let counter = await Counter.findOne({ id: key, companyId: decoded.companyId }).session(session);
//     if (!counter) {
//       const created = await Counter.create([{ id: key, companyId: decoded.companyId, seq: 1 }], { session });
//       counter = created[0];
//     } else {
//       counter.seq += 1;
//       await counter.save({ session });
//     }

//     const paddedSeq = String(counter.seq).padStart(5, "0");
//     const documentNumberPurchaseOrder = `PURCH-ORD/${financialYear}/${paddedSeq}`;
//     orderData.documentNumberPurchaseOrder = documentNumberPurchaseOrder;

//     // ✅ Create Purchase Order
//     const [purchaseOrder] = await PurchaseOrder.create([orderData], { session });

//     // ✅ Update linked Sales Orders (AFTER PO created)
//     if (Array.isArray(orderData.salesOrder) && orderData.salesOrder.length > 0) {
//       await SalesOrder.updateMany(
//         { _id: { $in: orderData.salesOrder }, companyId: decoded.companyId },
//         {
//           $set: {
//             linkedPurchaseOrder: purchaseOrder._id,
//             status: "LinkedToPurchaseOrder",
//           },
//         },
//         { session }
//       );
//     }

//     // ✅ Update Inventory + StockMovement
//     for (const item of purchaseOrder.items) {
//       await Inventory.updateOne(
//         { item: item.item, warehouse: item.warehouse, companyId: decoded.companyId },
//         { $inc: { onOrder: item.quantity || 0 } },
//         { upsert: true, session }
//       );

//       await StockMovement.create(
//         [
//           {
//             item: item.item,
//             warehouse: item.warehouse,
//             companyId: decoded.companyId,
//             movementType: "ON_ORDER",
//             quantity: item.quantity,
//             reference: purchaseOrder._id,
//             referenceType: "PurchaseOrder",
//             remarks: "Stock on order via Purchase Order",
//             createdBy: decoded.id,
//           },
//         ],
//         { session }
//       );
//     }

//     await session.commitTransaction();
//     session.endSession();

//     return NextResponse.json(
//       { success: true, message: "Purchase Order created successfully", data: purchaseOrder },
//       { status: 201 }
//     );
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("Purchase Order Error:", error);
//     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
//   }
// }

// // ✅ GET: Fetch Purchase Orders
// export async function GET(req) {
//   try {
//     await dbConnect();

//     const token = getTokenFromHeader(req);
//     if (!token) {
//       return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
//     }

//     const decoded = verifyJWT(token);
//     if (!decoded) {
//       return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
//     }

//     const { searchParams } = new URL(req.url);
//     const status = searchParams.get("status");
//     const supplier = searchParams.get("supplier");

//     const query = { companyId: decoded.companyId };
//     if (status) query.orderStatus = status;
//     if (supplier) query.supplier = supplier;

//     const orders = await PurchaseOrder.find(query)
//       .populate("supplier", "supplierName supplierCode contactPerson")
//       .populate("items.item", "itemName itemCode")
//       .sort({ createdAt: -1 });

//     return NextResponse.json({ success: true, data: orders }, { status: 200 });
//   } catch (error) {
//     console.error("GET /api/purchase-order error:", error);
//     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
//   }
// }

