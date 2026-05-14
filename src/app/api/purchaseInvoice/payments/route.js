import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import PurchaseInvoice from "@/models/InvoiceModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { autoPaymentEntry } from "@/lib/autoTransaction"; // you'll create this

export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) return NextResponse.json({ error: "Invalid token" }, { status: 403 });

    const { invoiceId, amount, paymentDate, paymentMethod, referenceNo, remarks } = await req.json();

    if (!invoiceId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid payment data" }, { status: 400 });
    }

    // Find invoice
    const invoice = await PurchaseInvoice.findById(invoiceId).session(session);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (invoice.companyId.toString() !== decoded.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Calculate new amounts
    const newPaidAmount = (invoice.paidAmount || 0) + amount;
    const newRemainingAmount = (invoice.grandTotal || 0) - newPaidAmount;
    let paymentStatus = "Pending";
    if (newRemainingAmount <= 0) paymentStatus = "Paid";
    else if (newPaidAmount > 0) paymentStatus = "Partial";

    // Update invoice
    invoice.paidAmount = newPaidAmount;
    invoice.remainingAmount = newRemainingAmount;
    invoice.paymentStatus = paymentStatus;
    await invoice.save({ session });

    // Record payment in a separate collection (optional)
    const Payment = mongoose.models.Payment || mongoose.model("Payment", new mongoose.Schema({
      companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
      invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseInvoice", required: true },
      amount: { type: Number, required: true },
      paymentDate: { type: Date, default: Date.now },
      paymentMethod: { type: String, enum: ["Cash", "Bank Transfer", "Cheque", "UPI"], default: "Bank Transfer" },
      referenceNo: { type: String },
      remarks: { type: String },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    }, { timestamps: true }));

    await Payment.create([{
      companyId: decoded.companyId,
      invoiceId: invoice._id,
      amount,
      paymentDate: paymentDate || new Date(),
      paymentMethod,
      referenceNo,
      remarks,
      createdBy: decoded.userId,
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // Auto accounting entry (if needed)
    try {
      await autoPaymentEntry({
        companyId: decoded.companyId,
        amount,
        partyId: invoice.supplier,
        partyName: invoice.supplierName,
        referenceId: invoice._id,
        referenceNumber: invoice.documentNumberPurchaseInvoice,
        narration: `Payment against invoice ${invoice.documentNumberPurchaseInvoice}`,
        date: paymentDate || new Date(),
        createdBy: decoded.userId,
      });
    } catch (accErr) {
      console.error("Accounting entry failed:", accErr);
    }

    return NextResponse.json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        invoiceId: invoice._id,
        paidAmount: invoice.paidAmount,
        remainingAmount: invoice.remainingAmount,
        paymentStatus: invoice.paymentStatus,
      }
    }, { status: 200 });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Optional: GET payment history for an invoice
export async function GET(req) {
  await dbConnect();
  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const decoded = verifyJWT(token);
  if (!decoded?.companyId) return NextResponse.json({ error: "Invalid token" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const invoiceId = searchParams.get("invoiceId");
  if (!invoiceId) return NextResponse.json({ error: "invoiceId required" }, { status: 400 });

  const Payment = mongoose.models.Payment;
  if (!Payment) return NextResponse.json({ error: "Payment model not registered" }, { status: 500 });

  const payments = await Payment.find({ invoiceId, companyId: decoded.companyId }).sort({ paymentDate: -1 });
  return NextResponse.json({ success: true, data: payments });
}