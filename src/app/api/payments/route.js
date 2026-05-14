// app/api/payments/route.js
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Payment from "@/models/Payment";
import SalesInvoice from "@/models/SalesInvoice";
import PurchaseInvoice from "@/models/InvoiceModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { autoPaymentReceipt, autoPaymentPaid } from "@/lib/autoTransaction";

export async function POST(req) {
  await dbConnect();

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ─── Auth ─────────────────────────────────────
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("Unauthorized");

    const user = verifyJWT(token);
    if (!user?.companyId) throw new Error("Invalid token");

    // ─── Body ─────────────────────────────────────
    const body = await req.json();

    const {
      type,
      date,
      amount,
      bankAccountId,
      partyType,
      partyId,
      partyName,
      paymentMode,
      narration,
      chequeNumber,
      utrNumber,
      appliedInvoices = [],
    } = body;

    // ─── Enhanced Validation ───────────────────────
    const errors = [];

    if (!type || !["Payment", "Receipt"].includes(type))
      errors.push("Valid type (Payment/Receipt) required");

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      errors.push("Amount must be a positive number");

    if (!bankAccountId || !mongoose.Types.ObjectId.isValid(bankAccountId))
      errors.push("Valid bankAccountId required");

    if (!partyType || !["Supplier", "Customer"].includes(partyType))
      errors.push("Valid partyType (Supplier/Customer) required");

    if (!partyId || !mongoose.Types.ObjectId.isValid(partyId))
      errors.push("Valid partyId required");

    if (!appliedInvoices || !Array.isArray(appliedInvoices) || appliedInvoices.length === 0)
      errors.push("At least one invoice must be selected");

    // Validate each applied invoice
    for (const inv of appliedInvoices) {
      if (!inv.invoiceId || !mongoose.Types.ObjectId.isValid(inv.invoiceId))
        errors.push(`Invalid invoiceId: ${inv.invoiceId}`);
      if (!inv.amount || isNaN(Number(inv.amount)) || Number(inv.amount) <= 0)
        errors.push(`Invalid amount for invoice ${inv.invoiceId}`);
    }

    if (errors.length > 0) {
      throw new Error(errors.join("; "));
    }

    const numericAmount = Number(amount);

    // ─── Create Payment ───────────────────────────
    const payment = await Payment.create([{
      companyId: user.companyId,
      type,
      date: date ? new Date(date) : new Date(),
      amount: numericAmount,
      bankAccountId,
      partyType,
      partyId,
      partyName: partyName || "",
      paymentMode: paymentMode || "Bank Transfer",
      narration: narration || "",
      chequeNumber: chequeNumber || null,
      utrNumber: utrNumber || null,
      appliedInvoices: appliedInvoices.map(inv => ({
        invoiceId: inv.invoiceId,
        invoiceNumber: inv.invoiceNumber || "",
        amount: Number(inv.amount),
      })),
      createdBy: user.id,
    }], { session });

    const savedPayment = payment[0];

    // ─── Update Invoices (reduce due amount) ──────
    for (const inv of appliedInvoices) {
      const InvoiceModel = partyType === "Supplier" ? PurchaseInvoice : SalesInvoice;

      const invoice = await InvoiceModel.findById(inv.invoiceId).session(session);
      if (!invoice) {
        throw new Error(`Invoice ${inv.invoiceId} not found`);
      }

      // Ensure your invoice models have `paidAmount` and `totalAmount`
      const currentPaid = invoice.paidAmount || 0;
      const newPaid = currentPaid + Number(inv.amount);
      if (newPaid > invoice.totalAmount) {
        throw new Error(`Payment exceeds invoice total for ${invoice.invoiceNumber}`);
      }

      invoice.paidAmount = newPaid;
      invoice.paymentStatus = newPaid >= invoice.totalAmount ? "Paid" : "Partial";
      // If you have a `dueAmount` field, update it as well
      if (invoice.dueAmount !== undefined) {
        invoice.dueAmount = invoice.totalAmount - newPaid;
      }
      await invoice.save({ session });
    }

    // ─── Accounting Entry (using your auto functions) ───
    // Make sure these functions accept `bankAccountId` or resolve the account name
    // I'm passing the bankAccountId – you may need to adjust your helper functions.
    if (partyType === "Customer") {
      await autoPaymentReceipt({
        companyId: user.companyId,
        amount: numericAmount,
        partyId,
        partyName,
        referenceId: savedPayment._id,
        referenceNumber: savedPayment.paymentNumber,
        narration: narration || "",
        date: date ? new Date(date) : new Date(),
        createdBy: user.id,
        paymentMode,
        bankAccountId,          // 👈 pass the ID so helper can find account
        bankAccountName: "Bank Account", // fallback
      });
    }

    if (partyType === "Supplier") {
      await autoPaymentPaid({
        companyId: user.companyId,
        amount: numericAmount,
        partyId,
        partyName,
        referenceId: savedPayment._id,
        referenceNumber: savedPayment.paymentNumber,
        narration: narration || "",
        date: date ? new Date(date) : new Date(),
        createdBy: user.id,
        paymentMode,
        bankAccountId,
        bankAccountName: "Bank Account",
      });
    }

    await session.commitTransaction();
    session.endSession();

    return Response.json({
      success: true,
      data: savedPayment,
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    console.error("Payment POST error:", err.message);
    return Response.json({
      success: false,
      message: err.message,
    }, { status: 400 });
  }
}
// import mongoose from "mongoose";
// import dbConnect from "@/lib/db";
// import Payment from "@/models/Payment";
// import SalesInvoice from "@/models/SalesInvoice";
// import PurchaseInvoice from "@/models/InvoiceModel";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { NextResponse } from "next/server";

// export async function POST(req) {
//   // auth 
//   const token = getTokenFromHeader(req);
//   if (!token) throw new Error("JWT token missing");
//   const user = verifyJWT(token);
//   if (!user) throw new Error("Unauthorized");
//   const { companyId } = user;
//   await dbConnect();
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//       const token = getTokenFromHeader(req);
//   if (!token) throw new Error("JWT token missing");
//   const user = verifyJWT(token);
//   if (!user) throw new Error("Unauthorized");

//     const paymentData = await req.json();
//     const { references = [], ...restData } = paymentData;

//     // Create Payment entry
//     const [payment] = await Payment.create([{ ...restData, references,companyId }], { session });

//     // Process all invoice references
//     for (const ref of references) {
//       const { invoiceId, model, paidAmount } = ref;

//       let InvoiceModel;
//       if (model === "SalesInvoice") {
//         InvoiceModel = SalesInvoice;
//       } else if (model === "PurchaseInvoice") {
//         InvoiceModel = PurchaseInvoice;
//       } else {
//         throw new Error(`Invalid model type: ${model}`);
//       }

//       // Fetch the invoice using the session
//       const invoice = await InvoiceModel.findById(invoiceId).session(session);
//       if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

//       // Update amounts
//       invoice.paidAmount += paidAmount;
//       invoice.remainingAmount = invoice.grandTotal - invoice.paidAmount;

//       // Update paymentStatus
//       if (invoice.remainingAmount <= 0) {
//         invoice.paymentStatus = "Paid";
//         invoice.remainingAmount = 0; // Avoid negative values
//       } else if (invoice.paidAmount > 0) {
//         invoice.paymentStatus = "Partial";
//       } else {
//         invoice.paymentStatus = "Pending";
//       }

//       await invoice.save({ session });
//     }

//     await session.commitTransaction();
//     session.endSession();

//     return new Response(
//       JSON.stringify({ message: "Payment recorded", paymentId: payment._id }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     // Only abort the transaction if it is still active.
//     if (session.inTransaction()) {
//       await session.abortTransaction();
//     }
//     session.endSession();
//     console.error("Error in payment API:", error);
//     return new Response(
//       JSON.stringify({ message: "Payment failed", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }
