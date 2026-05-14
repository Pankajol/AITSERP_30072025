import dbConnect from "@/lib/db";
import SalesInvoice from "@/models/SalesInvoice";
import PurchaseInvoice from "@/models/InvoiceModel"; // or wherever your PurchaseInvoice model is
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();
  const token = getTokenFromHeader(req);
  if (!token) return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const user = verifyJWT(token);
  if (!user?.companyId) return Response.json({ success: false, message: "Invalid token" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const partyType = searchParams.get("partyType");
  const partyId = searchParams.get("partyId");
  const status = searchParams.get("status");

  if (!partyType || !partyId) {
    return Response.json({ success: false, message: "Missing partyType or partyId" }, { status: 400 });
  }

  let query = { companyId: user.companyId };

  // ✅ Use correct field names from your schemas
  if (partyType === "Supplier") {
    query.supplier = partyId;       // PurchaseInvoice uses "supplier"
  } else if (partyType === "Customer") {
    query.customer = partyId;       // SalesInvoice uses "customer"
  } else {
    return Response.json({ success: false, message: "Invalid partyType" }, { status: 400 });
  }

  // ✅ For outstanding invoices, exclude those that are fully paid
  if (status === "outstanding") {
    query.paymentStatus = { $ne: "Paid" };
  }

  let invoices = [];
  if (partyType === "Customer") {
    // SalesInvoice: fields are "grandTotal", "paidAmount"
    invoices = await SalesInvoice.find(query).select("invoiceNumber grandTotal paidAmount paymentStatus");
  } else {
    // PurchaseInvoice: fields are "grandTotal", "paidAmount" (based on your schema)
    invoices = await PurchaseInvoice.find(query).select("documentNumberPurchaseInvoice grandTotal paidAmount paymentStatus");
  }

  // Map to consistent format, calculate dueAmount
  const result = invoices.map((inv) => {
    const total = inv.grandTotal || 0;
    const paid = inv.paidAmount || 0;
    const due = total - paid;
    return {
      _id: inv._id,
      invoiceNumber: inv.invoiceNumber || inv.documentNumberPurchaseInvoice,
      totalAmount: total,
      paidAmount: paid,
      dueAmount: due,
      paymentStatus: inv.paymentStatus,
    };
  }).filter(inv => inv.dueAmount > 0); // only show invoices with remaining balance

  return Response.json({ success: true, data: result });
}