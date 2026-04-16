import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import PurchaseInvoice from "@/models/InvoiceModel";
import Supplier from "@/models/SupplierModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();

  const token = getTokenFromHeader(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const decoded = verifyJWT(token);
  if (!decoded?.companyId) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get("supplierId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  if (!supplierId) {
    return NextResponse.json({ error: "supplierId is required" }, { status: 400 });
  }

  // 1. Validate supplier belongs to company
  const supplier = await Supplier.findOne({
    _id: supplierId,
    companyId: decoded.companyId,
  });
  if (!supplier) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  // 2. Build match stage for period
  const matchStage = {
    supplier: new mongoose.Types.ObjectId(supplierId),
    companyId: decoded.companyId,
  };
  if (startDate) {
    matchStage.documentDate = { $gte: new Date(startDate) };
  }
  if (endDate) {
    matchStage.documentDate = {
      ...matchStage.documentDate,
      $lte: new Date(endDate),
    };
  }

  // 3. Opening balance (invoices before startDate)
  let openingBalance = 0;
  if (startDate) {
    const openMatch = {
      supplier: new mongoose.Types.ObjectId(supplierId),
      companyId: decoded.companyId,
      documentDate: { $lt: new Date(startDate) },
    };
    const openRes = await PurchaseInvoice.aggregate([
      { $match: openMatch },
      {
        $group: {
          _id: null,
          total: { $sum: { $subtract: ["$grandTotal", "$paidAmount"] } },
        },
      },
    ]);
    openingBalance = openRes[0]?.total || 0;
  }

  // 4. Main aggregation pipeline
  const pipeline = [
    { $match: matchStage },
    { $sort: { documentDate: 1, createdAt: 1 } },
    {
      $project: {
        invoiceNo: "$documentNumberPurchaseInvoice",
        date: "$documentDate",
        grandTotal: 1,
        paidAmount: 1,
        remainingAmount: 1,
        paymentStatus: 1,
        remarks: 1,
      },
    },
    {
      $setWindowFields: {
        sortBy: { date: 1 },
        output: {
          runningBalance: {
            $sum: { $subtract: ["$grandTotal", "$paidAmount"] },
            window: { documents: ["unbounded", "current"] },
          },
        },
      },
    },
  ];

  // 5. Count total records for pagination
  const totalPipeline = [...pipeline, { $count: "total" }];
  const totalRes = await PurchaseInvoice.aggregate(totalPipeline);
  const totalRecords = totalRes[0]?.total || 0;

  // 6. Paginate
  const dataPipeline = [
    ...pipeline,
    { $skip: (page - 1) * limit },
    { $limit: limit },
  ];
  const transactions = await PurchaseInvoice.aggregate(dataPipeline);

  // 7. Adjust running balance with opening balance
  const transactionsWithOpening = transactions.map((t, idx) => {
    const runningWithOpening = openingBalance + t.runningBalance;
    return {
      ...t,
      openingBalance: idx === 0 ? openingBalance : undefined,
      closingBalance: runningWithOpening,
      runningBalance: runningWithOpening,
    };
  });

  const closingBalance =
    transactions.length > 0
      ? transactionsWithOpening[transactionsWithOpening.length - 1].closingBalance
      : openingBalance;

  return NextResponse.json({
    success: true,
    supplier: {
      _id: supplier._id,
      name: supplier.name,
      code: supplier.supplierCode,
    },
    period: { startDate: startDate || null, endDate: endDate || null },
    openingBalance,
    closingBalance,
    transactions: transactionsWithOpening,
    pagination: {
      page,
      limit,
      total: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    },
  });
}