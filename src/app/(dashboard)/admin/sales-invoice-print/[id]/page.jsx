"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function SalesInvoicePrint({ params }) {
  const { id } = params;
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await axios.get(`/api/sales-invoice/${id}`);
        setInvoice(res.data.data);
      } catch (error) {
        console.error("Error fetching invoice:", error);
      }
    };

    fetchInvoice();
  }, [id]);

  if (!invoice) return <div className="p-10">Loading...</div>;

  return (
   <main className="print-layout">
    {/* Print button for preview only */}
        <div className="text-center mt-8 no-print">
          <button
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-500"
          >
            Print Invoice
          </button>
        </div>
    <div className="invoice-sheet">
        <h2 className="text-center text-xl font-bold mb-4">Aits solution LPP</h2>

        <div className="text-sm mb-4">
          <p><strong>Invoice No:</strong> {invoice.invoiceNo}</p>
          <p><strong>Date:</strong> {new Date(invoice.orderDate).toLocaleDateString()}</p>
          <p><strong>Buyer:</strong> {invoice.customerName}</p>
          <p><strong>Address:</strong> {invoice.customerAddress}</p>
          <p><strong>GSTIN:</strong> {invoice.customerGST}</p>
        </div>

        <table className="w-full border border-collapse text-xs mb-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1">Sl</th>
              <th className="border px-2 py-1">Description</th>
              <th className="border px-2 py-1">HSN</th>
              <th className="border px-2 py-1">Qty</th>
              <th className="border px-2 py-1">Rate</th>
              <th className="border px-2 py-1">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, i) => (
              <tr key={i}>
                <td className="border px-2 py-1 text-center">{i + 1}</td>
                <td className="border px-2 py-1">{item.description}</td>
                <td className="border px-2 py-1">{item.hsn}</td>
                <td className="border px-2 py-1 text-center">{item.quantity}</td>
                <td className="border px-2 py-1 text-right">{item.rate}</td>
                <td className="border px-2 py-1 text-right">{item.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right text-sm mb-2">
          <p><strong>Subtotal:</strong> ₹{invoice.taxableValue}</p>
          <p><strong>CGST:</strong> ₹{invoice.cgst}</p>
          <p><strong>SGST:</strong> ₹{invoice.sgst}</p>
          <p className="text-base font-bold"><strong>Total:</strong> ₹{invoice.grandTotal}</p>
        </div>

        <p className="text-sm"><strong>Amount in words:</strong> {invoice.amountInWords}</p>

        <div className="mt-4 text-xs leading-5">
          <p className="font-semibold">Declaration:</p>
          <p>1. Material once sold will not be taken back.</p>
          <p>2. No claim after 7 days from delivery.</p>
          <p>3. Interest @24% p.a. for delayed payments.</p>
        </div>

        <div className="text-right text-sm mt-10">
          <p>For <strong>Shrirang Automation N Controls</strong></p>
          <br />
          <p>Authorized Signatory</p>
        </div>

        
      </div>
    </main>
  );
}
