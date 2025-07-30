import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SalesQuotation from "@/models/SalesQuotationModel";
import SalesOrder from "@/models/SalesOrder";
import Delivery from "@/models/deliveryModels";
import Invoice from "@/models/InvoiceModel";
import Customer from "@/models/CustomerModel";
import Supplier from "@/models/SupplierModels";
import PurchaseQuotation from "@/models/PurchaseQuotationModel";
import GRN from "@/models/grnModels";
import PurchaseInvoice from "@/models/InvoiceModel";

import PurchaseOrder from "@/models/PurchaseOrder";
import {
  sendSalesQuotationEmail,
  sendPurchaseQuotationEmail,
  sendPurchaseOrderEmail,
  sendSalesOrderEmail,
  sendDeliveryEmail,
  sendInvoiceEmail,
  sendGRNEmail,
  sendPurchaseInvoiceEmail,
} from "@/lib/mailer";

export async function POST(req) {
  try {
    const body = await req.json();
    const { type, id } = body;

    await dbConnect();

    if (type === "quotation") {
      //   const quotation = await SalesQuotation.findById(id);
      const quotation = await SalesQuotation.findById(id).populate("customer");
      const customerEmail = quotation.customer?.emailId;
      if (!customerEmail) {
        return Response.json(
          { success: false, message: "Customer email is missing" },
          { status: 400 }
        );
      }
      if (!quotation) {
        return Response.json(
          { success: false, message: "Quotation not found" },
          { status: 404 }
        );
      }

      await sendSalesQuotationEmail(
        [["pankajal2099@gmail.com"], customerEmail],
        quotation
      );
      return Response.json({ success: true, message: "Quotation email sent" });
    }

    if (type === "order") {
      const order = await SalesOrder.findById(id).populate("customer");
      const customerEmail = order.customer?.emailId;
      if (!customerEmail) {
        return Response.json(
          { success: false, message: "Customer email is missing" },
          { status: 400 }
        );
      }
      if (!order) {
        return Response.json(
          { success: false, message: "Order not found" },
          { status: 404 }
        );
      }

      await sendSalesOrderEmail(
        [["pankajal2099@gmail.com"], customerEmail],
        order
      );
      return Response.json({ success: true, message: "Order email sent" });
    }

    // send  Delivery  Email
    if (type === "delivery") {
      const delivery = await Delivery.findById(id).populate("customer");
      const customerEmail = order.customer?.emailId;
      if (!customerEmail) {
        return Response.json(
          { success: false, message: "Customer email is missing" },
          { status: 400 }
        );
      }

      if (!delivery) {
        return Response.json(
          { success: false, message: "Delivery not found" },
          { status: 404 }
        );
      }

      await sendDeliveryEmail(
        [["pankajal2099@gmail.com"], customerEmail],
        delivery
      );
      return Response.json({ success: true, message: "Delivery email sent" });
    }
    // Send Invoice
    if (type === "invoice") {
      const invoice = await Invoice.findById(id).populate("customer");
      const customerEmail = order.customer?.emailId;
      if (!customerEmail) {
        return Response.json(
          { success: false, message: "Customer email is missing" },
          { status: 400 }
        );
      }
      if (!invoice) {
        return Response.json(
          { success: false, message: "Invoice not found" },
          { status: 404 }
        );
      }
      await sendInvoiceEmail(
        [["pankajal2099@gmail.com"], customerEmail],
        invoice
      );
      return Response.json({ success: true, message: "Invoice email sent" });
    }

    // ✅ Send Purchase Quotation Email
    if (type === "purchase-quotation") {
      const quotation = await PurchaseQuotation.findById(id).populate(
        "supplier"
      );
      const supplierEmail = quotation.supplier?.emailId;
      if (!quotation) {
        return NextResponse.json(
          { success: false, message: "Purchase Quotation not found" },
          { status: 404 }
        );
      }

      // Use supplier email (you can populate supplier or keep in record)
      await sendPurchaseQuotationEmail(
        [["pankajal2099@gmail.com"], supplierEmail],
        quotation
      );
      return NextResponse.json({
        success: true,
        message: "Purchase Quotation email sent",
      });
    }
    // ✅ Send Purchase Order Email
    if (type === "purchase-order") {
      const order = await PurchaseOrder.findById(id).populate("supplier");
      const supplierEmail = order.supplier?.emailId;
      if (!order) {
        return Response.json(
          { success: false, message: "Purchase Order not found" },
          { status: 404 }
        );
      }

      // Use supplier email (you can populate supplier or keep in record)
      await sendPurchaseOrderEmail(
        [["pankajal2099@gmail.com"], supplierEmail],
        order
      );
      return Response.json({
        success: true,
        message: "Purchase Order email sent",
      });
    }

    // ✅ Send GRN Order Email
    if (type === "grn") {
      const grn = await GRN.findById(id).populate("supplier");
      const supplierEmail = grn.supplier?.emailId;
      if (!grn) {
        return Response.json(
          { success: false, message: "GRN not found" },
          { status: 404 }
        );
      }

      await sendGRNEmail([["pankajal2099@gmail.com"], supplierEmail], grn);
      return Response.json({
        success: true,
        message: "GRN email sent",
      });
    }

    // ✅ Send Purchase Invoice Order Email
    if (type === "purchase-invoice") {
      const invoice = await PurchaseInvoice.findById(id).populate("supplier");
      const supplierEmail = invoice.supplier?.emailId;
      if (!invoice) {
        return Response.json(
          { success: false, message: "Purchase Invoice not found" },
          { status: 404 }
        );
      }

      await sendPurchaseInvoiceEmail(
        [["pankajal2099@gmail.com"], supplierEmail],
        invoice
      );
      return Response.json({
        success: true,
        message: "Purchase Invoice email sent",
      });
    }

    return Response.json(
      { success: false, message: "Invalid type" },
      { status: 400 }
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { success: false, message: "Failed to send email" },
      { status: 500 }
    );
  }
}
