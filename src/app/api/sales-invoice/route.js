import mongoose from "mongoose";
import formidable from "formidable";
import { Readable } from "stream";
import dbConnect from "@/lib/db";
import Inventory from "@/models/Inventory";
import StockMovement from "@/models/StockMovement";
import SalesOrder from "@/models/SalesOrder";
import Delivery from "@/models/deliveryModels";
import SalesInvoice from "@/models/SalesInvoice";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Customer from "@/models/CustomerModel";
import { v2 as cloudinary } from "cloudinary";
import Counter from "@/models/Counter";

export const config = {
  api: { bodyParser: false },
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const { Types } = mongoose;

async function toNodeReq(request) {
  const buf = Buffer.from(await request.arrayBuffer());
  const nodeReq = new Readable({
    read() {
      this.push(buf);
      this.push(null);
    },
  });
  nodeReq.headers = Object.fromEntries(request.headers.entries());
  nodeReq.method = request.method;
  nodeReq.url = request.url || "/";
  return nodeReq;
}

async function parseMultipart(request) {
  const nodeReq = await toNodeReq(request);
  const form = formidable({ multiples: true, keepExtensions: true });
  return new Promise((res, rej) =>
    form.parse(nodeReq, (err, fields, files) =>
      err ? rej(err) : res({ fields, files })
    )
  );
}

export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("JWT token missing");
    const user = verifyJWT(token);
    if (!user) throw new Error("Unauthorized");

    const { fields, files } = await parseMultipart(req);
    const invoiceData = JSON.parse(fields.invoiceData || "{}");

    invoiceData.invoiceDate = invoiceData.invoiceDate || new Date();
    invoiceData.companyId = user.companyId;
    if (user.type === "user") invoiceData.createdBy = user.id;
    delete invoiceData._id;

    if (Array.isArray(invoiceData.items)) {
      invoiceData.items = invoiceData.items.map((item) => {
        delete item._id;
        return item;
      });
    }

    // ✅ Upload attachments
    const newFiles = Array.isArray(files.newAttachments)
      ? files.newAttachments
      : files.newAttachments
      ? [files.newAttachments]
      : [];

    const uploadedFiles = await Promise.all(
      newFiles.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.filepath, {
          folder: "invoices",
          resource_type: "auto",
        });
        return {
          fileName: file.originalFilename,
          fileUrl: result.secure_url,
          fileType: file.mimetype,
          uploadedAt: new Date(),
        };
      })
    );

    invoiceData.attachments = [
      ...(invoiceData.attachments || []),
      ...uploadedFiles,
    ];

    // ✅ Generate Financial Year and Counter
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    let fyStart = currentYear;
    let fyEnd = currentYear + 1;
    if (currentMonth < 4) {
      fyStart = currentYear - 1;
      fyEnd = currentYear;
    }
    const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
    const key = `SalesInvoice-${financialYear}`;

    let counter = await Counter.findOne({
      id: key,
      companyId: user.companyId,
    }).session(session);

    if (!counter) {
      [counter] = await Counter.create(
        [{ id: key, companyId: user.companyId, seq: 1 }],
        { session }
      );
    } else {
      counter.seq += 1;
      await counter.save({ session });
    }

    const paddedSeq = String(counter.seq).padStart(5, "0");
    invoiceData.invoiceNumber = `SALES-INV/${financialYear}/${paddedSeq}`;

    // ✅ Ensure amounts
    const grandTotal = Number(invoiceData.grandTotal) || 0;
    const paidAmount = Number(invoiceData.paidAmount) || 0;
    invoiceData.openBalance = grandTotal;
    invoiceData.remainingAmount = Math.max(grandTotal - paidAmount, 0);

    const [invoice] = await SalesInvoice.create([invoiceData], { session });

    const isCopied = !!invoiceData.sourceId;
    const sourceModel = (invoiceData.sourceModel || "").toLowerCase();

    // ✅ Inventory handling (only if not from Delivery)
    if (!isCopied || sourceModel === "salesorder") {
      for (const item of invoiceData.items) {
        const inventoryDoc = await Inventory.findOne({
          item: new Types.ObjectId(item.item),
          warehouse: new Types.ObjectId(item.warehouse),
        }).session(session);

        if (!inventoryDoc)
          throw new Error(`Inventory not found for ${item.item}`);

        // ✅ Batch-level update
        if (item.batches?.length > 0) {
          for (const allocated of item.batches) {
            const batchIndex = inventoryDoc.batches.findIndex(
              (b) => b.batchNumber === allocated.batchCode
            );
            if (batchIndex === -1)
              throw new Error(`Batch ${allocated.batchCode} not found`);
            if (
              inventoryDoc.batches[batchIndex].quantity <
              allocated.allocatedQuantity
            )
              throw new Error(
                `Insufficient stock in batch ${allocated.batchCode}`
              );
            inventoryDoc.batches[batchIndex].quantity -=
              allocated.allocatedQuantity;
          }
        }

        if (inventoryDoc.quantity < item.quantity)
          throw new Error(`Insufficient stock for ${item.item}`);
        inventoryDoc.quantity -= item.quantity;

        if (isCopied && sourceModel === "salesorder") {
          inventoryDoc.committed = Math.max(
            (inventoryDoc.committed || 0) - item.quantity,
            0
          );
        }

        await inventoryDoc.save({ session });

        await StockMovement.create(
          [
            {
              companyId: user.companyId,
              item: item.item,
              warehouse: item.warehouse,
              movementType: "OUT",
              quantity: item.quantity,
              reference: invoice._id,
              remarks: isCopied
                ? `Sales Invoice (From ${sourceModel.toUpperCase()})`
                : "Sales Invoice (Direct)",
            },
          ],
          { session }
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invoice created successfully, stock updated",
        invoiceId: invoice._id,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}



// import mongoose from "mongoose";
// import formidable from "formidable";
// import { Readable } from "stream";
// import dbConnect from "@/lib/db";
// import Inventory from "@/models/Inventory";
// import StockMovement from "@/models/StockMovement";
// import SalesOrder from "@/models/SalesOrder";
// import Delivery from "@/models/deliveryModels";
// import SalesInvoice from "@/models/SalesInvoice";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import Customer from "@/models/CustomerModel";
// import { v2 as cloudinary } from "cloudinary";
// import Counter from "@/models/Counter";

// export const config = {
//   api: { bodyParser: false },
// };

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const { Types } = mongoose;

// // ✅ Convert Next.js request to Node stream
// async function toNodeReq(request) {
//   const buf = Buffer.from(await request.arrayBuffer());
//   const nodeReq = new Readable({
//     read() {
//       this.push(buf);
//       this.push(null);
//     },
//   });
//   nodeReq.headers = Object.fromEntries(request.headers.entries());
//   nodeReq.method = request.method;
//   nodeReq.url = request.url || "/";
//   return nodeReq;
// }

// // ✅ Parse multipart form
// async function parseMultipart(request) {
//   const nodeReq = await toNodeReq(request);
//   const form = formidable({ multiples: true, keepExtensions: true });
//   return new Promise((res, rej) =>
//     form.parse(nodeReq, (err, fields, files) => (err ? rej(err) : res({ fields, files })))
//   );
// }

// /**
//  * ✅ CREATE SALES INVOICE (POST)
//  */
// export async function POST(req) {
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     // ✅ Auth check
//     const token = getTokenFromHeader(req);
//     if (!token) throw new Error("JWT token missing");
//     const user = verifyJWT(token);
//     if (!user) throw new Error("Unauthorized");
    
//     // ✅ Parse form data
//     const { fields, files } = await parseMultipart(req);
//     const invoiceData = JSON.parse(fields.invoiceData || "{}");

//     invoiceData.invoiceDate = invoiceData.invoiceDate || new Date();
//     invoiceData.companyId = user.companyId;
//     if (user.type === "user") invoiceData.createdBy = user.id;

//     delete invoiceData._id;

//     // ✅ Remove _id from items
//     if (Array.isArray(invoiceData.items)) {
//       invoiceData.items = invoiceData.items.map((item) => {
//         delete item._id;
//         return item;
//       });
//     }

//     // ✅ Upload attachments to Cloudinary
//     const newFiles = Array.isArray(files.newAttachments)
//       ? files.newAttachments
//       : files.newAttachments
//       ? [files.newAttachments]
//       : [];

//     const uploadedFiles = await Promise.all(
//       newFiles.map(async (file) => {
//         const result = await cloudinary.uploader.upload(file.filepath, {
//           folder: "invoices",
//           resource_type: "auto",
//         });
//         return {
//           fileName: file.originalFilename,
//           fileUrl: result.secure_url,
//           fileType: file.mimetype,
//           uploadedAt: new Date(),
//         };
//       })
//     );

//     invoiceData.attachments = [
//       ...(invoiceData.attachments || []),
//       ...uploadedFiles,
//     ];
    
//         const now = new Date();
//         const currentYear = now.getFullYear();
//         const currentMonth = now.getMonth() + 1;
//         let fyStart = currentYear;
//         let fyEnd = currentYear + 1;
//         if (currentMonth < 4) {
//           fyStart = currentYear - 1;
//           fyEnd = currentYear;
//         }
//         const financialYear = `${fyStart}-${String(fyEnd).slice(-2)}`;
//         const key = "SalesInvoice";
    
//         let counter = await Counter.findOne({ id: key, companyId: user.companyId }).session(mongoSession);
//         if (!counter) {
//           const [created] = await Counter.create([{ id: key, companyId: user.companyId, seq: 1 }], { session: mongoSession });
//           counter = created;
//         } else {
//           counter.seq += 1;
//           await counter.save({ session: mongoSession });
//         }
    
//         const paddedSeq = String(counter.seq).padStart(5, "0");
//         invoiceData.documentNumberPurchaseInvoice = `SALES-INV/${financialYear}/${paddedSeq}`;
    

//     // ✅ Create Invoice
//     // Ensure numbers
// const grandTotal = Number(invoiceData.grandTotal) || 0;
// const paidAmount = Number(invoiceData.paidAmount) || 0;

// // Calculate open balance and remaining amount
// invoiceData.openBalance = grandTotal;
// invoiceData.remainingAmount = grandTotal - paidAmount;

// // Ensure no negative remaining amount
// if (invoiceData.remainingAmount < 0) {
//   invoiceData.remainingAmount = 0;
// }

// // Now insert into DB
// const [invoice] = await SalesInvoice.create([invoiceData], { session });


//     // const [invoice] = await SalesInvoice.create([invoiceData], { session });

//     const isCopied = !!invoiceData.sourceId;
//     const sourceModel = (invoiceData.sourceModel || "").toLowerCase();

  


//     // ✅ Update Inventory & Stock only if not copied from delivery
// if (!isCopied || sourceModel === "salesorder") {
//   for (const item of invoiceData.items) {
//     const inventoryDoc = await Inventory.findOne({
//       item: new Types.ObjectId(item.item),
//       warehouse: new Types.ObjectId(item.warehouse),
//     }).session(session);

//     if (!inventoryDoc) throw new Error(`Inventory not found for ${item.item}`);

//     if (item.batches?.length > 0) {
//       for (const allocated of item.batches) {
//         const batchIndex = inventoryDoc.batches.findIndex(
//           (b) => b.batchNumber === allocated.batchCode
//         );
//         if (batchIndex === -1)
//           throw new Error(`Batch ${allocated.batchCode} not found`);
//         if (
//           inventoryDoc.batches[batchIndex].quantity < allocated.allocatedQuantity
//         )
//           throw new Error(`Insufficient stock in batch ${allocated.batchCode}`);
//         inventoryDoc.batches[batchIndex].quantity -= allocated.allocatedQuantity;
//       }
//     }

//     if (inventoryDoc.quantity < item.quantity)
//       throw new Error(`Insufficient stock for ${item.item}`);
//     inventoryDoc.quantity -= item.quantity;

//     if (isCopied && sourceModel === "salesorder") {
//       inventoryDoc.committed = Math.max(
//         (inventoryDoc.committed || 0) - item.quantity,
//         0
//       );
//     }

//     await inventoryDoc.save({ session });

//     await StockMovement.create(
//       [
//         {
//           companyId: user.companyId,
//           item: item.item,
//           warehouse: item.warehouse,
//           movementType: "OUT",
//           quantity: item.quantity,
//           reference: invoice._id,
//           remarks: isCopied
//             ? `Sales Invoice (From ${sourceModel.toUpperCase()})`
//             : "Sales Invoice (Direct)",
//         },
//       ],
//       { session }
//     );
//   }
// }



//     await session.commitTransaction();
//     session.endSession();

//     return new Response(
//       JSON.stringify({
//         success: true,
//         message: "Invoice created successfully, stock updated",
//         invoiceId: invoice._id,
//       }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     await session.abortTransaction();
//     session.endSession();
//     return new Response(
//       JSON.stringify({ success: false, message: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }






export async function GET(req) {
  try {
    await dbConnect();

    // ✅ Authenticate request
    const token = getTokenFromHeader(req);
    if (!token)
      return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });

    const user = verifyJWT(token);
    if (!user)
      return new Response(JSON.stringify({ message: "Invalid token" }), { status: 403 });

    // ✅ Parse query params
    const { searchParams } = new URL(req.url);
    const customerCode = searchParams.get("customerCode");

    // ✅ Build secure query scoped to user's company
    const query = { companyId: user.companyId };
    if (customerCode) {
      query.customerCode = customerCode;
    }

    // ✅ Fetch and populate
    const invoices = await SalesInvoice.find(query)
      .populate("customer") // Assuming 'customer' is a valid ref field in schema
      .sort({ createdAt: -1 });

    return new Response(JSON.stringify({ success: true, data: invoices }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("SalesInvoice GET error:", error);
    return new Response(
      JSON.stringify({ message: "Error fetching invoices", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

