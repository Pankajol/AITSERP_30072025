
// /lib/mailer.js
import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST || "smtp.gmail.com";
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const port = Number(process.env.SMTP_PORT || (process.env.SMTP_SECURE === "false" ? 587 : 465));
const secure = port === 465;

export const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  logger: true,
  debug: true,
  tls: { rejectUnauthorized: false },
});

// transporter.verify()
//   .then(() => console.log("mailer: SMTP verified OK"))
//   .catch((err) => console.error("mailer: SMTP verify failed:", err && (err.message || err)));

export default transporter;

export async function sendMail({ to, subject, html }) {
  return transporter.sendMail({
    from: user,
    to,
    subject,
    html,
  });
}


export async function sendSalesQuotationEmail(toEmails, salesQuotation) {
  // Build Items Table
  const itemsHTML = salesQuotation.items
    .map(
      (item) => `
      <tr>
        <td style="border:1px solid #ccc;padding:8px;">${item.itemCode || "-"}</td>
        <td style="border:1px solid #ccc;padding:8px;">${item.itemName || "-"}</td>
        <td style="border:1px solid #ccc;padding:8px;">${item.itemDescription || "-"}</td>
        <td style="border:1px solid #ccc;padding:8px;">${item.quantity || 0}</td>
        <td style="border:1px solid #ccc;padding:8px;">₹${item.unitPrice.toFixed(2)}</td>
        <td style="border:1px solid #ccc;padding:8px;">₹${item.discount.toFixed(2)}</td>
        <td style="border:1px solid #ccc;padding:8px;">${
          item.warehouseCode ? `${item.warehouseCode} - ${item.warehouseName}` : "-"
        }</td>
        <td style="border:1px solid #ccc;padding:8px;">₹${item.totalAmount.toFixed(2)}</td>
      </tr>
    `
    )
    .join("");

  const mailOptions = {
    from: `"ERP System" <${process.env.SMTP_USER}>`,
     to: toEmails.join(","),
    subject: `Sales Quotation: ${salesQuotation.quotationNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
        <h2>Sales Quotation Details</h2>
        <p><strong>Customer Code:</strong> ${salesQuotation.customerCode}</p>
        <p><strong>Customer Name:</strong> ${salesQuotation.customerName}</p>
        <p><strong>Contact Person:</strong> ${salesQuotation.contactPerson || "-"}</p>
        <p><strong>Reference Number:</strong> ${salesQuotation.refNumber || "-"}</p>
        <p><strong>Sales Employee:</strong> ${salesQuotation.salesEmployee || "-"}</p>
        <p><strong>Status:</strong> ${salesQuotation.status}</p>
        <p><strong>Posting Date:</strong> ${salesQuotation.postingDate ? new Date(salesQuotation.postingDate).toLocaleDateString() : "-"}</p>
        <p><strong>Valid Until:</strong> ${salesQuotation.validUntil ? new Date(salesQuotation.validUntil).toLocaleDateString() : "-"}</p>
        <p><strong>Document Date:</strong> ${salesQuotation.documentDate ? new Date(salesQuotation.documentDate).toLocaleDateString() : "-"}</p>
        ${salesQuotation.remarks ? `<p><strong>Remarks:</strong> ${salesQuotation.remarks}</p>` : ""}
        
        <h3>Items</h3>
        <table style="border-collapse:collapse;width:100%;border:1px solid #ccc;">
          <thead>
            <tr style="background:#f9f9f9;">
              <th style="border:1px solid #ccc;padding:8px;">Item Code</th>
              <th style="border:1px solid #ccc;padding:8px;">Item Name</th>
              <th style="border:1px solid #ccc;padding:8px;">Description</th>
              <th style="border:1px solid #ccc;padding:8px;">Qty</th>
              <th style="border:1px solid #ccc;padding:8px;">Unit Price</th>
              <th style="border:1px solid #ccc;padding:8px;">Discount</th>
              <th style="border:1px solid #ccc;padding:8px;">Warehouse</th>
              <th style="border:1px solid #ccc;padding:8px;">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
        </table>
        
        <h3>Financial Summary</h3>
        <p><strong>Total Before Discount:</strong> ₹${salesQuotation.totalBeforeDiscount.toFixed(2)}</p>
        <p><strong>Freight:</strong> ₹${salesQuotation.freight.toFixed(2)}</p>
        <p><strong>Rounding:</strong> ₹${salesQuotation.rounding.toFixed(2)}</p>
        <p><strong>GST Amount:</strong> ₹${salesQuotation.gstAmount.toFixed(2)}</p>
        <p><strong>CGST Amount:</strong> ₹${salesQuotation.cgstAmount.toFixed(2)}</p>
        <p><strong>SGST Amount:</strong> ₹${salesQuotation.sgstAmount.toFixed(2)}</p>
        <p><strong>IGST Amount:</strong> ₹${salesQuotation.igstAmount.toFixed(2)}</p>
        <p><strong>Total Down Payment:</strong> ₹${salesQuotation.totalDownPayment.toFixed(2)}</p>
        <p><strong>Applied Amounts:</strong> ₹${salesQuotation.appliedAmounts.toFixed(2)}</p>
        <p><strong>Open Balance:</strong> ₹${salesQuotation.openBalance.toFixed(2)}</p>
        <h2 style="color:#2d3748;">Grand Total: ₹${salesQuotation.grandTotal.toFixed(2)}</h2>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export async function sendSalesOrderEmail(toEmails, salesOrder) {
  // ✅ Build Items Table
  const itemsHTML = salesOrder.items
    .map(
      (item) => `
        <tr>
          <td style="border:1px solid #ccc;padding:8px;">${item.itemCode || "-"}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.itemName || "-"}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.itemDescription || "-"}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.quantity || 0}</td>
          <td style="border:1px solid #ccc;padding:8px;">₹${item.unitPrice?.toFixed(2) || "0.00"}</td>
          <td style="border:1px solid #ccc;padding:8px;">₹${item.discount?.toFixed(2) || "0.00"}</td>
          <td style="border:1px solid #ccc;padding:8px;">${
            item.warehouseCode ? `${item.warehouseCode} - ${item.warehouseName}` : "-"
          }</td>
          <td style="border:1px solid #ccc;padding:8px;">₹${item.totalAmount?.toFixed(2) || "0.00"}</td>
        </tr>
      `
    )
    .join("");

  const mailOptions = {
    from: `"ERP System" <${process.env.SMTP_USER}>`,
    to: toEmails.join(","),
    subject: `Sales Order: ${salesOrder.orderNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
        <h2>Sales Order Details</h2>
        <p><strong>Customer Code:</strong> ${salesOrder.customerCode}</p>
        <p><strong>Customer Name:</strong> ${salesOrder.customerName}</p>
        <p><strong>Contact Person:</strong> ${salesOrder.contactPerson || "-"}</p>
        <p><strong>Reference Number:</strong> ${salesOrder.refNumber || "-"}</p>
        <p><strong>Sales Employee:</strong> ${salesOrder.salesEmployee || "-"}</p>
        <p><strong>Status:</strong> ${salesOrder.status}</p>
        <p><strong>Posting Date:</strong> ${salesOrder.postingDate ? new Date(salesOrder.postingDate).toLocaleDateString() : "-"}</p>
        <p><strong>Delivery Date:</strong> ${salesOrder.deliveryDate ? new Date(salesOrder.deliveryDate).toLocaleDateString() : "-"}</p>
        <p><strong>Document Date:</strong> ${salesOrder.documentDate ? new Date(salesOrder.documentDate).toLocaleDateString() : "-"}</p>
        ${salesOrder.remarks ? `<p><strong>Remarks:</strong> ${salesOrder.remarks}</p>` : ""}

        <h3>Items</h3>
        <table style="border-collapse:collapse;width:100%;border:1px solid #ccc;">
          <thead>
            <tr style="background:#f9f9f9;">
              <th style="border:1px solid #ccc;padding:8px;">Item Code</th>
              <th style="border:1px solid #ccc;padding:8px;">Item Name</th>
              <th style="border:1px solid #ccc;padding:8px;">Description</th>
              <th style="border:1px solid #ccc;padding:8px;">Qty</th>
              <th style="border:1px solid #ccc;padding:8px;">Unit Price</th>
              <th style="border:1px solid #ccc;padding:8px;">Discount</th>
              <th style="border:1px solid #ccc;padding:8px;">Warehouse</th>
              <th style="border:1px solid #ccc;padding:8px;">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
        </table>

        <h3>Financial Summary</h3>
        <p><strong>Total Before Discount:</strong> ₹${salesOrder.totalBeforeDiscount?.toFixed(2) || "0.00"}</p>
        <p><strong>Freight:</strong> ₹${salesOrder.freight?.toFixed(2) || "0.00"}</p>
        <p><strong>Rounding:</strong> ₹${salesOrder.rounding?.toFixed(2) || "0.00"}</p>
        <p><strong>GST Amount:</strong> ₹${salesOrder.gstAmount?.toFixed(2) || "0.00"}</p>
        <p><strong>CGST Amount:</strong> ₹${salesOrder.cgstAmount?.toFixed(2) || "0.00"}</p>
        <p><strong>SGST Amount:</strong> ₹${salesOrder.sgstAmount?.toFixed(2) || "0.00"}</p>
        <p><strong>IGST Amount:</strong> ₹${salesOrder.igstAmount?.toFixed(2) || "0.00"}</p>
        <p><strong>Total Down Payment:</strong> ₹${salesOrder.totalDownPayment?.toFixed(2) || "0.00"}</p>
        <p><strong>Applied Amounts:</strong> ₹${salesOrder.appliedAmounts?.toFixed(2) || "0.00"}</p>
        <p><strong>Open Balance:</strong> ₹${salesOrder.openBalance?.toFixed(2) || "0.00"}</p>
        <h2 style="color:#2d3748;">Grand Total: ₹${salesOrder.grandTotal?.toFixed(2) || "0.00"}</h2>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export async function sendDeliveryEmail(toEmails, delivery) {
  const itemsHTML = delivery.items
    .map(
      (item) => `
        <tr>
          <td style="border:1px solid #ccc;padding:8px;">${item.itemCode || "-"}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.itemName || "-"}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.itemDescription || "-"}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.quantity || 0}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.uom || "-"}</td>
          <td style="border:1px solid #ccc;padding:8px;">${
            item.warehouseCode ? `${item.warehouseCode} - ${item.warehouseName}` : "-"
          }</td>
        </tr>
      `
    )
    .join("");

  const mailOptions = {
    from: `"ERP System" <${process.env.SMTP_USER}>`,
    to: toEmails.join(","),
    subject: `Delivery Note: ${delivery.deliveryNumber || "N/A"}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
        <h2>Delivery Note</h2>
        <p><strong>Customer Code:</strong> ${delivery.customerCode}</p>
        <p><strong>Customer Name:</strong> ${delivery.customerName}</p>
        <p><strong>Contact Person:</strong> ${delivery.contactPerson || "-"}</p>
        <p><strong>Reference Number:</strong> ${delivery.refNumber || "-"}</p>
        <p><strong>Status:</strong> ${delivery.status || "-"}</p>
        <p><strong>Posting Date:</strong> ${delivery.postingDate ? new Date(delivery.postingDate).toLocaleDateString() : "-"}</p>
        <p><strong>Delivery Date:</strong> ${delivery.deliveryDate ? new Date(delivery.deliveryDate).toLocaleDateString() : "-"}</p>
        <p><strong>Document Date:</strong> ${delivery.documentDate ? new Date(delivery.documentDate).toLocaleDateString() : "-"}</p>
        ${delivery.remarks ? `<p><strong>Remarks:</strong> ${delivery.remarks}</p>` : ""}

        <h3>Items</h3>
        <table style="border-collapse:collapse;width:100%;border:1px solid #ccc;">
          <thead>
            <tr style="background:#f9f9f9;">
              <th style="border:1px solid #ccc;padding:8px;">Item Code</th>
              <th style="border:1px solid #ccc;padding:8px;">Item Name</th>
              <th style="border:1px solid #ccc;padding:8px;">Description</th>
              <th style="border:1px solid #ccc;padding:8px;">Quantity</th>
              <th style="border:1px solid #ccc;padding:8px;">UOM</th>
              <th style="border:1px solid #ccc;padding:8px;">Warehouse</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
        </table>

        ${
          delivery.carrier || delivery.trackingNumber
            ? `<h3>Logistics</h3>
               <p><strong>Carrier:</strong> ${delivery.carrier || "-"}</p>
               <p><strong>Tracking Number:</strong> ${delivery.trackingNumber || "-"}</p>`
            : ""
        }

        <p style="margin-top: 20px;">Thank you for your business!</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export async function sendInvoiceEmail(toEmails, invoice) {
  const itemsHTML = invoice.items
    .map(
      (item) => `
        <tr>
          <td style="border:1px solid #ccc;padding:8px;">${item.itemCode || "-"}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.itemName || "-"}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.itemDescription || "-"}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.quantity || 0}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.uom || "-"}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.unitPrice || 0}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.totalPrice || 0}</td>
        </tr>
      `
    )
    .join("");

  const mailOptions = {
    from: `"ERP System" <${process.env.SMTP_USER}>`,
    to: toEmails.join(","),
    subject: `Sales Invoice: ${invoice.invoiceNumber || "N/A"}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
        <h2>Sales Invoice</h2>
        <p><strong>Customer Code:</strong> ${invoice.customerCode}</p>
        <p><strong>Customer Name:</strong> ${invoice.customerName}</p>
        <p><strong>Contact Person:</strong> ${invoice.contactPerson || "-"}</p>
        <p><strong>Status:</strong> ${invoice.status || "-"}</p>
        <p><strong>Posting Date:</strong> ${invoice.postingDate ? new Date(invoice.postingDate).toLocaleDateString() : "-"}</p>
        <p><strong>Due Date:</strong> ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : "-"}</p>
        <p><strong>Document Date:</strong> ${invoice.documentDate ? new Date(invoice.documentDate).toLocaleDateString() : "-"}</p>
        ${invoice.remarks ? `<p><strong>Remarks:</strong> ${invoice.remarks}</p>` : ""}

        <h3>Items</h3>
        <table style="border-collapse:collapse;width:100%;border:1px solid #ccc;">
          <thead>
            <tr style="background:#f9f9f9;">
              <th style="border:1px solid #ccc;padding:8px;">Item Code</th>
              <th style="border:1px solid #ccc;padding:8px;">Item Name</th>
              <th style="border:1px solid #ccc;padding:8px;">Description</th>
              <th style="border:1px solid #ccc;padding:8px;">Quantity</th>
              <th style="border:1px solid #ccc;padding:8px;">UOM</th>
              <th style="border:1px solid #ccc;padding:8px;">Unit Price</th>
              <th style="border:1px solid #ccc;padding:8px;">Total Price</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
        </table>

        <h3>Summary</h3>
        <p><strong>Subtotal:</strong> ${invoice.subTotal || 0}</p>
        <p><strong>Tax:</strong> ${invoice.tax || 0}</p>
        <p><strong>Total Amount:</strong> ${invoice.totalAmount || 0}</p>

        <p style="margin-top: 20px;">Thank you for your business!</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}





export async function sendPurchaseQuotationEmail(toEmails, purchaseQuotation) {
  // ✅ Build Items Table
  const itemsHTML = purchaseQuotation.items
    .map(
      (item) => `
      <tr>
        <td style="border:1px solid #ccc;padding:8px;">${item.itemCode || "-"}</td>
        <td style="border:1px solid #ccc;padding:8px;">${item.itemName || "-"}</td>
        <td style="border:1px solid #ccc;padding:8px;">${item.itemDescription || "-"}</td>
        <td style="border:1px solid #ccc;padding:8px;">${item.quantity || 0}</td>
        <td style="border:1px solid #ccc;padding:8px;">₹${(item.unitPrice || 0).toFixed(2)}</td>
        <td style="border:1px solid #ccc;padding:8px;">₹${(item.discount || 0).toFixed(2)}</td>
        <td style="border:1px solid #ccc;padding:8px;">${
          item.warehouseCode ? `${item.warehouseCode} - ${item.warehouseName}` : "-"
        }</td>
        <td style="border:1px solid #ccc;padding:8px;">₹${(item.totalAmount || 0).toFixed(2)}</td>
      </tr>
    `
    )
    .join("");

  // ✅ Email Content
  const mailOptions = {
    from: `"ERP System" <${process.env.SMTP_USER}>`,
    to: toEmails.join(","),
    subject: `Purchase Quotation: ${purchaseQuotation.referenceNumber || "No Ref"}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
        <h2>Purchase Quotation Details</h2>
        <p><strong>Supplier Code:</strong> ${purchaseQuotation.supplierCode}</p>
        <p><strong>Supplier Name:</strong> ${purchaseQuotation.supplierName}</p>
        <p><strong>Contact Person:</strong> ${purchaseQuotation.contactPerson || "-"}</p>
        <p><strong>Reference Number:</strong> ${purchaseQuotation.referenceNumber || "-"}</p>
        <p><strong>Status:</strong> ${purchaseQuotation.status}</p>
        <p><strong>Posting Date:</strong> ${
          purchaseQuotation.postingDate ? new Date(purchaseQuotation.postingDate).toLocaleDateString() : "-"
        }</p>
        <p><strong>Valid Until:</strong> ${
          purchaseQuotation.validUntil ? new Date(purchaseQuotation.validUntil).toLocaleDateString() : "-"
        }</p>
        <p><strong>Document Date:</strong> ${
          purchaseQuotation.documentDate ? new Date(purchaseQuotation.documentDate).toLocaleDateString() : "-"
        }</p>
        ${purchaseQuotation.remarks ? `<p><strong>Remarks:</strong> ${purchaseQuotation.remarks}</p>` : ""}
        
        <h3>Items</h3>
        <table style="border-collapse:collapse;width:100%;border:1px solid #ccc;">
          <thead>
            <tr style="background:#f9f9f9;">
              <th style="border:1px solid #ccc;padding:8px;">Item Code</th>
              <th style="border:1px solid #ccc;padding:8px;">Item Name</th>
              <th style="border:1px solid #ccc;padding:8px;">Description</th>
              <th style="border:1px solid #ccc;padding:8px;">Qty</th>
              <th style="border:1px solid #ccc;padding:8px;">Unit Price</th>
              <th style="border:1px solid #ccc;padding:8px;">Discount</th>
              <th style="border:1px solid #ccc;padding:8px;">Warehouse</th>
              <th style="border:1px solid #ccc;padding:8px;">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
        </table>
        
        <h3>Financial Summary</h3>
        <p><strong>Total Before Discount:</strong> ₹${(purchaseQuotation.totalBeforeDiscount || 0).toFixed(2)}</p>
        <p><strong>Freight:</strong> ₹${(purchaseQuotation.freight || 0).toFixed(2)}</p>
        <p><strong>Rounding:</strong> ₹${(purchaseQuotation.rounding || 0).toFixed(2)}</p>
        <p><strong>GST Amount:</strong> ₹${(purchaseQuotation.gstAmount || 0).toFixed(2)}</p>
        <p><strong>Total Down Payment:</strong> ₹${(purchaseQuotation.totalDownPayment || 0).toFixed(2)}</p>
        <p><strong>Applied Amounts:</strong> ₹${(purchaseQuotation.appliedAmounts || 0).toFixed(2)}</p>
        <p><strong>Open Balance:</strong> ₹${(purchaseQuotation.openBalance || 0).toFixed(2)}</p>
        <h2 style="color:#2d3748;">Grand Total: ₹${(purchaseQuotation.grandTotal || 0).toFixed(2)}</h2>
      </div>
    `,
  };

  // ✅ Send Email
  await transporter.sendMail(mailOptions);
}


export async function sendPurchaseOrderEmail(toEmails, purchaseOrder) {
  // ✅ Build Items Table
  const itemsHTML = purchaseOrder.items
    .map(
      (item) => `
      <tr>
        <td style="border:1px solid #ccc;padding:8px;">${item.itemCode || "-"}</td>
        <td style="border:1px solid #ccc;padding:8px;">${item.itemName || "-"}</td>
        <td style="border:1px solid #ccc;padding:8px;">${item.itemDescription || "-"}</td>
        <td style="border:1px solid #ccc;padding:8px;">${item.quantity || 0}</td>
        <td style="border:1px solid #ccc;padding:8px;">₹${(item.unitPrice || 0).toFixed(2)}</td>
        <td style="border:1px solid #ccc;padding:8px;">₹${(item.discount || 0).toFixed(2)}</td>
        <td style="border:1px solid #ccc;padding:8px;">${
          item.warehouseCode ? `${item.warehouseCode} - ${item.warehouseName}` : "-"
        }</td>
        <td style="border:1px solid #ccc;padding:8px;">₹${(item.totalAmount || 0).toFixed(2)}</td>
      </tr>
    `
    )
    .join("");

  // ✅ Email Content
  const mailOptions = {
    from: `"ERP System" <${process.env.SMTP_USER}>`,
    to: toEmails.join(","),
    subject: `Purchase Order: ${purchaseOrder.orderNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
        <h2>Purchase Order Details</h2>
        <p><strong>Supplier Code:</strong> ${purchaseOrder.supplierCode}</p>
        <p><strong>Supplier Name:</strong> ${purchaseOrder.supplierName}</p>
        <p><strong>Contact Person:</strong> ${purchaseOrder.contactPerson || "-"}</p>
        <p><strong>Reference Number:</strong> ${purchaseOrder.referenceNumber || "-"}</p>
        <p><strong>Status:</strong> ${purchaseOrder.status}</p>
        <p><strong>Posting Date:</strong> ${purchaseOrder.postingDate ? new Date(purchaseOrder.postingDate).toLocaleDateString() : "-"}</p>
        <p><strong>Valid Until:</strong> ${purchaseOrder.validUntil ? new Date(purchaseOrder.validUntil).toLocaleDateString() : "-"}</p>
        <p><strong>Document Date:</strong> ${purchaseOrder.documentDate ? new Date(purchaseOrder.documentDate).toLocaleDateString() : "-"}</p>
        ${purchaseOrder.remarks ? `<p><strong>Remarks:</strong> ${purchaseOrder.remarks}</p>` : ""}   
        <h3>Items</h3>
        <table style="border-collapse:collapse;width:100%;border:1px solid #ccc;">
          <thead>
            <tr style="background:#f9f9f9;">
              <th style="border:1px solid #ccc;padding:8px;">Item Code</th>
              <th style="border:1px solid #ccc;padding:8px;">Item Name</th>
              <th style="border:1px solid #ccc;padding:8px;">Description</th>
              <th style="border:1px solid #ccc;padding:8px;">Qty</th>
              <th style="border:1px solid #ccc;padding:8px;">Unit Price</th>
              <th style="border:1px solid #ccc;padding:8px;">Discount</th>
              <th style="border:1px solid #ccc;padding:8px;">Warehouse</th>
              <th style="border:1px solid #ccc;padding:8px;">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
        </table>
        <h3>Financial Summary</h3>
        <p><strong>Total Before Discount:</strong> ₹${(purchaseOrder.totalBeforeDiscount || 0).toFixed(2)}</p>
        <p><strong>Freight:</strong> ₹${(purchaseOrder.freight || 0).toFixed(2)}</p>
        <p><strong>Rounding:</strong> ₹${(purchaseOrder.rounding || 0).toFixed(2)}</p>  
        <p><strong>GST Amount:</strong> ₹${(purchaseOrder.gstAmount || 0).toFixed(2)}</p>
        <p><strong>Total Down Payment:</strong> ₹${(purchaseOrder.totalDownPayment || 0).toFixed(2)}</p>
        <p><strong>Applied Amounts:</strong> ₹${(purchaseOrder.appliedAmounts || 0).toFixed(2)}</p>
        <p><strong>Open Balance:</strong> ₹${(purchaseOrder.openBalance || 0).toFixed(2)}</p>
        <h2 style="color:#2d3748;">Grand Total: ₹${(purchaseOrder.grandTotal || 0).toFixed(2)}</h2>
      </div>
    `,
  };  
  // ✅ Send Email
  await transporter.sendMail(mailOptions);
  console.log(`Purchase Order email sent to: ${toEmails.join(", ")}`);
}



export async function sendGRNEmail(toEmails, grn) {
  const itemsHTML = grn.items
    .map(
      (item) => `
        <tr>
          <td style="border:1px solid #ccc;padding:8px;">${item.itemCode || "-"}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.itemName || "-"}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.itemDescription || "-"}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.quantity || 0}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.uom || "-"}</td>
          <td style="border:1px solid #ccc;padding:8px;">${
            item.warehouseCode ? `${item.warehouseCode} - ${item.warehouseName}` : "-"
          }</td>
        </tr>
      `
    )
    .join("");

  const mailOptions = {
    from: `"ERP System" <${process.env.SMTP_USER}>`,
    to: toEmails.join(","),
    subject: `Goods Receipt Note: ${grn.grnNumber || "N/A"}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
        <h2>Goods Receipt Note (GRN)</h2>
        <p><strong>Supplier Code:</strong> ${grn.supplierCode}</p>
        <p><strong>Supplier Name:</strong> ${grn.supplierName}</p>
        <p><strong>Contact Person:</strong> ${grn.contactPerson || "-"}</p>
        <p><strong>Reference Number:</strong> ${grn.referenceNumber || "-"}</p>
        <p><strong>Status:</strong> ${grn.status || "-"}</p>
        <p><strong>Posting Date:</strong> ${grn.postingDate ? new Date(grn.postingDate).toLocaleDateString() : "-"}</p>
        <p><strong>Document Date:</strong> ${grn.documentDate ? new Date(grn.documentDate).toLocaleDateString() : "-"}</p>
        ${grn.remarks ? `<p><strong>Remarks:</strong> ${grn.remarks}</p>` : ""}

        <h3>Items</h3>
        <table style="border-collapse:collapse;width:100%;border:1px solid #ccc;">
          <thead>
            <tr style="background:#f9f9f9;">
              <th style="border:1px solid #ccc;padding:8px;">Item Code</th>
              <th style="border:1px solid #ccc;padding:8px;">Item Name</th>
              <th style="border:1px solid #ccc;padding:8px;">Description</th>
              <th style="border:1px solid #ccc;padding:8px;">Quantity</th>
              <th style="border:1px solid #ccc;padding:8px;">UOM</th>
              <th style="border:1px solid #ccc;padding:8px;">Warehouse</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
        </table>

        <p style="margin-top: 20px;">Thank you!</p>
      </div>
    `,
  };

  // ✅ Send Email
  await transporter.sendMail(mailOptions);
  console.log(`GRN email sent to: ${toEmails.join(", ")}`);
}



export async function sendPurchaseInvoiceEmail(toEmails, purchaseInvoice) {
  const itemsHTML = purchaseInvoice.items
    .map(
      (item) => `
        <tr>
          <td style="border:1px solid #ccc;padding:8px;">${item.itemCode || "-"}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.itemName || "-"}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.itemDescription || "-"}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.quantity || 0}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.uom || "-"}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.unitPrice || 0}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.discount || 0}</td>
          <td style="border:1px solid #ccc;padding:8px;">${item.total || 0}</td>
        </tr>
      `
    )
    .join("");

  const mailOptions = {
    from: `"ERP System" <${process.env.SMTP_USER}>`,
    to: toEmails.join(","),
    subject: `Purchase Invoice: ${purchaseInvoice.invoiceNumber || "N/A"}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
        <h2>Purchase Invoice</h2>
        <p><strong>Vendor Code:</strong> ${purchaseInvoice.vendorCode || "-"}</p>
        <p><strong>Vendor Name:</strong> ${purchaseInvoice.vendorName || "-"}</p>
        <p><strong>Contact Person:</strong> ${purchaseInvoice.contactPerson || "-"}</p>
        <p><strong>Invoice Number:</strong> ${purchaseInvoice.invoiceNumber || "-"}</p>
        <p><strong>Reference Number:</strong> ${purchaseInvoice.referenceNumber || "-"}</p>
        <p><strong>Status:</strong> ${purchaseInvoice.status || "-"}</p>
        <p><strong>Posting Date:</strong> ${purchaseInvoice.postingDate ? new Date(purchaseInvoice.postingDate).toLocaleDateString() : "-"}</p>
        <p><strong>Document Date:</strong> ${purchaseInvoice.documentDate ? new Date(purchaseInvoice.documentDate).toLocaleDateString() : "-"}</p>
        ${purchaseInvoice.remarks ? `<p><strong>Remarks:</strong> ${purchaseInvoice.remarks}</p>` : ""}

        <h3>Items</h3>
        <table style="border-collapse:collapse;width:100%;border:1px solid #ccc;">
          <thead>
            <tr style="background:#f9f9f9;">
              <th style="border:1px solid #ccc;padding:8px;">Item Code</th>
              <th style="border:1px solid #ccc;padding:8px;">Item Name</th>
              <th style="border:1px solid #ccc;padding:8px;">Description</th>
              <th style="border:1px solid #ccc;padding:8px;">Quantity</th>
              <th style="border:1px solid #ccc;padding:8px;">UOM</th>
              <th style="border:1px solid #ccc;padding:8px;">Unit Price</th>
              <th style="border:1px solid #ccc;padding:8px;">Discount</th>
              <th style="border:1px solid #ccc;padding:8px;">Total</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
        </table>

        <p style="margin-top: 20px;">Thank you!</p>
      </div>
    `,
  };

  // ✅ Send Email
  await transporter.sendMail(mailOptions);
  console.log(`Purchase Invoice email sent to: ${toEmails.join(", ")}`);
}




// leaving space for future mailer functions

export async function sendLeaveMail({ to, employee, status, from, to: end }) {
  if (!to) return;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"HR Team" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Your leave is ${status}`,
    html: `
      <h3>Hello ${employee},</h3>
      <p>Your leave request is <strong>${status}</strong>.</p>
      <p><b>From:</b> ${new Date(from).toDateString()}</p>
      <p><b>To:</b> ${new Date(end).toDateString()}</p>
    `,
  });
}


