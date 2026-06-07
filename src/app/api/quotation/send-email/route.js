import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import SalesQuotation from "@/models/SalesQuotationModel";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Helper: generate PDF buffer
async function generateQuotationPDF(quotation) {
  const doc = new PDFDocument();
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  doc.on("end", () => {});
  doc.fontSize(20).text("QUOTATION", { align: "center" });
  doc.moveDown();
  doc.fontSize(10);
  doc.text(`Number: ${quotation.documentNumberQuatation}`);
  doc.text(`Date: ${new Date(quotation.documentDate).toLocaleDateString()}`);
  doc.text(`Valid Until: ${new Date(quotation.validUntil).toLocaleDateString()}`);
  doc.text(`Customer: ${quotation.customerName}`);
  doc.moveDown();
  const startX = 50;
  let y = doc.y;
  doc.font("Helvetica-Bold");
  doc.text("Item", startX, y);
  doc.text("Qty", startX + 200, y);
  doc.text("Price", startX + 270, y);
  doc.text("Amount", startX + 370, y);
  doc.moveDown();
  doc.font("Helvetica");
  quotation.items.forEach((item) => {
    y = doc.y;
    doc.text(item.itemName, startX, y, { width: 180 });
    doc.text(item.quantity.toString(), startX + 200, y);
    doc.text(`₹${item.unitPrice.toFixed(2)}`, startX + 270, y);
    doc.text(`₹${item.totalAmount.toFixed(2)}`, startX + 370, y);
    doc.moveDown();
  });
  doc.moveDown();
  doc.text(`Total: ₹${quotation.grandTotal.toFixed(2)}`, { align: "right" });
  doc.end();
  return Buffer.concat(chunks);
}

export async function POST(req) {
  await dbConnect();
  const token = getTokenFromHeader(req);
  const decoded = verifyJWT(token);
  const { quotationId, email, customerName } = await req.json();
  if (!quotationId || !email) {
    return NextResponse.json({ error: "Missing quotationId or email" }, { status: 400 });
  }
  const quotation = await SalesQuotation.findById(quotationId);
  if (!quotation) return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  if (quotation.companyId.toString() !== decoded.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const pdfBuffer = await generateQuotationPDF(quotation);
  await transporter.sendMail({
    from: `"Your Company" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `Quotation ${quotation.documentNumberQuatation} - ${customerName}`,
    html: `
      <h2>Dear ${customerName},</h2>
      <p>Please find attached your quotation (${quotation.documentNumberQuatation}).</p>
      <p>Total Amount: ₹${quotation.grandTotal.toFixed(2)}</p>
      <p>Valid until: ${new Date(quotation.validUntil).toLocaleDateString()}</p>
      <br/>
      <p>For any queries, please contact us.</p>
    `,
    attachments: [{
      filename: `Quotation-${quotation.documentNumberQuatation}.pdf`,
      content: pdfBuffer,
      contentType: "application/pdf",
    }],
  });
  return NextResponse.json({ success: true, message: "Email sent successfully" });
}