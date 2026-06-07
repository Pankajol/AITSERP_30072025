// app/api/quotation/[id]/pdf/route.js
import dbConnect from "@/lib/db";
import SalesQuotation from "@/models/SalesQuotationModel";
import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  await dbConnect();
  const { id } = params;
  const quote = await SalesQuotation.findById(id);
  if (!quote) {
    return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  }

  const doc = new PDFDocument();
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  doc.on("end", () => {});

  // Header
  doc.fontSize(20).text("QUOTATION", { align: "center" });
  doc.moveDown();
  doc.fontSize(10);
  doc.text(`Number: ${quote.documentNumberQuatation}`);
  doc.text(`Date: ${new Date(quote.documentDate).toLocaleDateString()}`);
  doc.text(`Valid Until: ${new Date(quote.validUntil).toLocaleDateString()}`);
  doc.text(`Customer: ${quote.customerName}`);
  doc.moveDown();

  // Table headers
  const startX = 50;
  let y = doc.y;
  doc.font("Helvetica-Bold");
  doc.text("Item", startX, y);
  doc.text("Qty", startX + 200, y);
  doc.text("Price", startX + 270, y);
  doc.text("Amount", startX + 370, y);
  doc.moveDown();
  doc.font("Helvetica");

  // Items
  quote.items.forEach((item) => {
    y = doc.y;
    doc.text(item.itemName, startX, y, { width: 180 });
    doc.text(item.quantity.toString(), startX + 200, y);
    doc.text(`₹${item.unitPrice.toFixed(2)}`, startX + 270, y);
    doc.text(`₹${item.totalAmount.toFixed(2)}`, startX + 370, y);
    doc.moveDown();
  });

  doc.moveDown();
  doc.text(`Total: ₹${quote.grandTotal.toFixed(2)}`, { align: "right" });
  doc.end();

  const buffer = Buffer.concat(chunks);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="quotation-${quote.documentNumberQuatation}.pdf"`,
    },
  });
}