// GET /api/reports/outstanding

import SalesInvoice from "@/models/SalesInvoice";
import PurchaseInvoice from "@/models/InvoiceModel";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // Customer / Supplier

  const Model = type === "Supplier"
    ? PurchaseInvoice
    : SalesInvoice;

  const invoices = await Model.find({
    paymentStatus: { $ne: "Paid" }
  });

  const today = new Date();

  const data = invoices.map(inv => {
    const outstanding = inv.totalAmount - (inv.paidAmount || 0);

    const days = Math.floor(
      (today - new Date(inv.invoiceDate)) / (1000 * 60 * 60 * 24)
    );

    let bucket = "0-30";
    if (days > 30 && days <= 60) bucket = "31-60";
    else if (days > 60 && days <= 90) bucket = "61-90";
    else if (days > 90) bucket = "90+";

    return {
      partyName: inv.customerName || inv.supplierName,
      invoiceNumber: inv.invoiceNumber,
      outstanding,
      days,
      bucket
    };
  });

  return Response.json({ success: true, data });
}