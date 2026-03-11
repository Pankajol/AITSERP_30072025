"use client";

import Link from "next/link";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FaArrowLeft, FaEdit, FaUser, FaCalendarAlt,
  FaBoxOpen, FaCalculator, FaPaperclip, FaMapMarkerAlt
} from "react-icons/fa";

export default function SalesInvoiceDetail() {
  const { id } = useParams();
  const router  = useRouter();
  const [invoice, setInvoice] = useState(null);
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await axios.get(`/api/sales-invoice/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.data) setInvoice(res.data.data);
        else setError("Invoice not found");
      } catch (err) {
        console.error(err);
        setError("Failed to fetch invoice");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(value || 0);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const StatusBadge = ({ status }) => {
    const map = {
      Paid:      "bg-emerald-50 text-emerald-700 border-emerald-200",
      Closed:    "bg-emerald-50 text-emerald-700 border-emerald-200",
      Pending:   "bg-amber-50 text-amber-700 border-amber-200",
      Open:      "bg-blue-50 text-blue-700 border-blue-200",
      Cancelled: "bg-red-50 text-red-700 border-red-200",
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${map[status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
        {status || "—"}
      </span>
    );
  };

  const SectionCard = ({ icon: Icon, title, children, color = "indigo" }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-${color}-50/40`}>
        <div className={`w-8 h-8 rounded-lg bg-${color}-100 flex items-center justify-center text-${color}-500`}><Icon className="text-sm" /></div>
        <p className="text-sm font-bold text-gray-900">{title}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );

  const InfoRow = ({ label, value }) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value || "—"}</span>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading invoice...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><p className="text-red-500 font-semibold">{error}</p>
        <button onClick={() => router.push("/admin/sales-invoice-view")} className="mt-4 text-indigo-600 text-sm hover:underline">← Back to invoices</button>
      </div>
    </div>
  );

  if (!invoice) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <button onClick={() => router.push("/admin/sales-invoice-view")}
          className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4 hover:text-indigo-800 transition-colors">
          <FaArrowLeft className="text-xs" /> Back to Invoices
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Sales Invoice</h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-sm text-gray-400">
              <span className="font-mono font-bold text-indigo-600">{invoice.documentNumber || "—"}</span>
              {" · "} Created {formatDate(invoice.createdAt || invoice.invoiceDate)}
            </p>
          </div>
          <button onClick={() => router.push(`/admin/sales-invoice-view/new?editId=${invoice._id}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
            <FaEdit className="text-xs" /> Edit Invoice
          </button>
        </div>

        {/* Customer Info */}
        <SectionCard icon={FaUser} title="Customer Information" color="indigo">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <InfoRow label="Customer Code" value={invoice.customerCode} />
            <InfoRow label="Customer Name" value={invoice.customerName} />
            <InfoRow label="Contact Person" value={invoice.contactPerson} />
            <InfoRow label="Sales Employee" value={invoice.salesEmployee} />
          </div>
        </SectionCard>

        {/* Dates & Status */}
        <SectionCard icon={FaCalendarAlt} title="Invoice Dates & Status" color="blue">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <InfoRow label="Invoice Date"   value={formatDate(invoice.invoiceDate)} />
            <InfoRow label="Due Date"       value={formatDate(invoice.dueDate)} />
            <InfoRow label="Reference No."  value={invoice.refNumber} />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Status</span>
              <StatusBadge status={invoice.status} />
            </div>
          </div>
        </SectionCard>

        {/* Addresses */}
        {(invoice.billingAddress || invoice.shippingAddress) && (
          <SectionCard icon={FaMapMarkerAlt} title="Address Information" color="violet">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {invoice.billingAddress && (
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-blue-500 mb-2">Billing Address</p>
                  <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 text-sm text-gray-700 leading-relaxed space-y-0.5">
                    {invoice.billingAddress.address1  && <p>{invoice.billingAddress.address1}</p>}
                    {invoice.billingAddress.address2  && <p>{invoice.billingAddress.address2}</p>}
                    <p>{[invoice.billingAddress.city, invoice.billingAddress.state, invoice.billingAddress.zip].filter(Boolean).join(", ")}</p>
                    {invoice.billingAddress.country   && <p>{invoice.billingAddress.country}</p>}
                  </div>
                </div>
              )}
              {invoice.shippingAddress && (
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-500 mb-2">Shipping Address</p>
                  <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 text-sm text-gray-700 leading-relaxed space-y-0.5">
                    {invoice.shippingAddress.address1 && <p>{invoice.shippingAddress.address1}</p>}
                    {invoice.shippingAddress.address2 && <p>{invoice.shippingAddress.address2}</p>}
                    <p>{[invoice.shippingAddress.city, invoice.shippingAddress.state, invoice.shippingAddress.zip].filter(Boolean).join(", ")}</p>
                    {invoice.shippingAddress.country  && <p>{invoice.shippingAddress.country}</p>}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Items Table */}
        <SectionCard icon={FaBoxOpen} title="Line Items" color="emerald">
          {invoice.items && invoice.items.length > 0 ? (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["#", "Item Code", "Item Name", "Description", "Warehouse", "Qty", "Unit Price", "Discount", "Tax", "Total"].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, index) => (
                      <tr key={index} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-3 py-3 text-xs text-gray-300 font-mono">{index + 1}</td>
                        <td className="px-3 py-3">
                          <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{item.itemCode || "—"}</span>
                        </td>
                        <td className="px-3 py-3 font-semibold text-gray-800">{item.itemName}</td>
                        <td className="px-3 py-3 text-xs text-gray-500 max-w-[150px] truncate">{item.itemDescription}</td>
                        <td className="px-3 py-3 text-xs text-gray-500">{item.warehouseCode ? `${item.warehouseCode} - ${item.warehouseName}` : "—"}</td>
                        <td className="px-3 py-3">
                          <div className="text-xs">
                            <p className="font-bold text-gray-800">{item.quantity}</p>
                            {item.allowedQuantity  > 0 && <p className="text-emerald-600">Allowed: {item.allowedQuantity}</p>}
                            {item.receivedQuantity > 0 && <p className="text-blue-600">Received: {item.receivedQuantity}</p>}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-xs font-semibold text-gray-700">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-3 py-3 text-right text-xs text-gray-500">{formatCurrency(item.discount)}</td>
                        <td className="px-3 py-3 text-center text-xs">
                          <span className="font-semibold text-gray-600">{item.taxOption}: {item.gstRate}%</span>
                          <p className="text-gray-400">{formatCurrency(item.gstAmount)}</p>
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-gray-900">{formatCurrency(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile */}
              <div className="md:hidden space-y-3">
                {invoice.items.map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{item.itemCode}</span>
                        <p className="font-bold text-gray-800 text-sm mt-1">{item.itemName}</p>
                      </div>
                      <span className="font-bold text-gray-900 text-sm">{formatCurrency(item.totalAmount)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-gray-500">
                      <span>Qty: <b className="text-gray-700">{item.quantity}</b></span>
                      <span>Price: <b className="text-gray-700">₹{item.unitPrice}</b></span>
                      <span>Tax: <b className="text-gray-700">{item.gstRate}%</b></span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-300">
              <div className="text-3xl mb-2">📦</div>
              <p className="text-sm">No items available</p>
            </div>
          )}
        </SectionCard>

        {/* Financial Summary */}
        <SectionCard icon={FaCalculator} title="Financial Summary" color="amber">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {[
              { label: "Total Before Discount", value: formatCurrency(invoice.totalBeforeDiscount) },
              { label: "GST Total",             value: formatCurrency(invoice.gstTotal) },
              { label: "Freight",               value: formatCurrency(invoice.freight) },
              { label: "Rounding",              value: formatCurrency(invoice.rounding) },
              { label: "Total Down Payment",    value: formatCurrency(invoice.totalDownPayment) },
              { label: "Applied Amounts",       value: formatCurrency(invoice.appliedAmounts) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
                <p className="text-sm font-bold text-gray-800">{value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-indigo-600 rounded-2xl p-4 text-white">
              <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Grand Total</p>
              <p className="text-2xl font-black">{formatCurrency(invoice.grandTotal)}</p>
            </div>
            <div className="bg-gray-100 rounded-2xl p-4">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Open Balance</p>
              <p className="text-2xl font-black text-gray-800">{formatCurrency(invoice.openBalance)}</p>
            </div>
          </div>
          {invoice.remarks && (
            <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-xl p-4">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-yellow-600 mb-1">Remarks</p>
              <p className="text-sm text-gray-700">{invoice.remarks}</p>
            </div>
          )}
        </SectionCard>

        {/* Attachments */}
        {invoice.attachments && invoice.attachments.length > 0 && (
          <SectionCard icon={FaPaperclip} title="Attachments" color="gray">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {invoice.attachments.map((att, i) => {
                const isImage = att.fileType?.startsWith("image/");
                const isPDF   = att.fileType === "application/pdf" || att.fileName?.toLowerCase().endsWith(".pdf");
                return (
                  <div key={i} className="border rounded-xl p-2 bg-gray-50 hover:shadow-md transition-all">
                    <div className="h-24 flex items-center justify-center overflow-hidden rounded-lg mb-2">
                      {isImage ? (
                        <img src={att.fileUrl} alt={att.fileName} className="h-full object-cover w-full rounded-lg" />
                      ) : isPDF ? (
                        <iframe src={att.fileUrl} className="w-full h-full rounded-lg" title="PDF Preview" />
                      ) : (
                        <div className="text-3xl">📎</div>
                      )}
                    </div>
                    <a href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="block text-[10px] text-indigo-600 truncate font-semibold hover:underline">{att.fileName}</a>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 pb-10">
          <button onClick={() => router.push("/admin/sales-invoice-view")}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">
            <FaArrowLeft className="text-xs" /> Back to List
          </button>
          <button onClick={() => router.push(`/admin/sales-invoice-view/new?editId=${invoice._id}`)}
            className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            <FaEdit className="text-xs" /> Edit Invoice
          </button>
        </div>
      </div>
    </div>
  );
}



// 'use client';

// import Link from 'next/link';
// import axios from 'axios';
// import { useParams } from 'next/navigation';
// import { useEffect, useState } from 'react';

// export default function InvoiceDetail() {
//   const { id } = useParams();
//   const [invoice, setInvoice] = useState(null);
//   const [error, setError] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchInvoice = async () => {
//       try {
//         setLoading(true);
//         const res = await axios.get(`/api/sales-invoice/${id}`);
//         if (res.data && res.data.data) {
//           setInvoice(res.data.data);
//         } else {
//           setError('Invoice not found');
//         }
//       } catch (error) {
//         console.error('Failed to fetch sales invoice:', error);
//         setError('Failed to fetch invoice details');
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (id) {
//       fetchInvoice();
//     }
//   }, [id]);

//   const formatCurrency = (value) => {
//     return new Intl.NumberFormat('en-IN', {
//       style: 'currency',
//       currency: 'INR',
//       minimumFractionDigits: 2
//     }).format(value || 0);
//   };

//   const formatDate = (dateString) => {
//     return dateString ? new Date(dateString).toLocaleDateString() : '-';
//   };

//   const getPaymentStatusColor = (status) => {
//     switch (status) {
//       case 'Paid': return 'bg-green-100 text-green-800';
//       case 'Partial': return 'bg-yellow-100 text-yellow-800';
//       default: return 'bg-red-100 text-red-800';
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center h-screen">
//         <div className="text-xl">Loading invoice details...</div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="container mx-auto p-6">
//         <p className="text-red-600 text-xl">{error}</p>
//         <Link href="/admin/sales-invoice-view">
//           <button className="mt-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded">
//             Back to Invoice List
//           </button>
//         </Link>
//       </div>
//     );
//   }

//   if (!invoice) {
//     return (
//       <div className="container mx-auto p-6">
//         <p>Invoice not found</p>
//         <Link href="/admin/sales-invoice-view">
//           <button className="mt-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded">
//             Back to Invoice List
//           </button>
//         </Link>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto p-6">
//       <Link href="/admin/sales-invoice-view">
//         <button className="mb-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition">
//           ← Back to Invoice List
//         </button>
//       </Link>
      
//       <h1 className="text-3xl font-bold mb-6">Sales Invoice Details</h1>
      
//       <div className="bg-white shadow-md rounded-lg p-6 mb-6">
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
//           <div>
//             <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
//             <div className="space-y-2">
//               <p><strong>Customer Code:</strong> {invoice.customerCode}</p>
//               <p><strong>Customer Name:</strong> {invoice.customerName}</p>
//               <p><strong>Contact Person:</strong> {invoice.contactPerson}</p>
//               <p><strong>Sales Employee:</strong> {invoice.salesEmployee || '-'}</p>
//             </div>
//           </div>
          
//           <div>
//             <h2 className="text-xl font-semibold mb-4">Invoice Information</h2>
//             <div className="space-y-2">
//               <p><strong>Invoice Number:</strong> {invoice.invoiceNumber}</p>
//               <p><strong>Reference Number:</strong> {invoice.refNumber || '-'}</p>
//               <p><strong>Order Date:</strong> {formatDate(invoice.orderDate)}</p>
//               <p><strong>Expected Delivery:</strong> {formatDate(invoice.expectedDeliveryDate)}</p>
//               <p>
//                 <strong>Status:</strong> 
//                 <span className={`ml-2 px-2 py-1 rounded text-sm ${
//                   invoice.status === "Confirmed" 
//                     ? "bg-green-200 text-green-800" 
//                     : "bg-yellow-200 text-yellow-800"
//                 }`}>
//                   {invoice.status}
//                 </span>
//               </p>
//               <p><strong>From Quote:</strong> {invoice.fromQuote ? 'Yes' : 'No'}</p>
//             </div>
//           </div>
//         </div>
        
//         <div className="mt-4 pt-4 border-t">
//           <h2 className="text-xl font-semibold mb-2">Financial Summary</h2>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div className="space-y-1">
//               <p><strong>Total Before Discount:</strong> {formatCurrency(invoice.totalBeforeDiscount)}</p>
//               <p><strong>Freight:</strong> {formatCurrency(invoice.freight)}</p>
//               <p><strong>Rounding:</strong> {formatCurrency(invoice.rounding)}</p>
//               <p><strong>Total Down Payment:</strong> {formatCurrency(invoice.totalDownPayment)}</p>
//             </div>
//             <div className="space-y-1">
//               <p><strong>Applied Amounts:</strong> {formatCurrency(invoice.appliedAmounts)}</p>
//               <p><strong>Open Balance:</strong> {formatCurrency(invoice.openBalance)}</p>
//               <p><strong>GST Total:</strong> {formatCurrency(invoice.gstTotal)}</p>
//               <p>
//                 <strong>Payment Status:</strong>
//                 <span className={`ml-2 px-2 py-1 rounded text-sm ${getPaymentStatusColor(invoice.paymentStatus)}`}>
//                   {invoice.paymentStatus}
//                 </span>
//               </p>
//             </div>
//           </div>
//           <div className="mt-4 pt-4 border-t">
//             <div className="flex justify-between items-center">
//               <p className="text-xl font-bold">Grand Total: {formatCurrency(invoice.grandTotal)}</p>
//               <div className="text-right">
//                 <p><strong>Paid Amount:</strong> {formatCurrency(invoice.paidAmount)}</p>
//                 <p><strong>Remaining Amount:</strong> {formatCurrency(invoice.remainingAmount)}</p>
//               </div>
//             </div>
//           </div>
//         </div>
        
//         {invoice.remarks && (
//           <div className="mt-6 pt-4 border-t">
//             <h2 className="text-xl font-semibold mb-2">Remarks</h2>
//             <p className="text-gray-700">{invoice.remarks}</p>
//           </div>
//         )}
//       </div>

//       <div className="bg-white shadow-md rounded-lg p-6 mb-6">
//         <h2 className="text-2xl font-semibold mb-4">Invoice Items</h2>
//         {invoice.items && invoice.items.length > 0 ? (
//           <div className="overflow-x-auto">
//             <table className="min-w-full border-collapse">
//               <thead className="bg-gray-100">
//                 <tr>
//                   <th className="border p-2 text-left">Item Code</th>
//                   <th className="border p-2 text-left">Item Name</th>
//                   <th className="border p-2 text-left">Description</th>
//                   <th className="border p-2 text-left">Warehouse</th>
//                   <th className="border p-2 text-center">Quantity</th>
//                   <th className="border p-2 text-center">Unit Price</th>
//                   <th className="border p-2 text-center">Discount</th>
//                   <th className="border p-2 text-center">Total</th>
//                   <th className="border p-2 text-center">Batch Details</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {invoice.items.map((item, index) => (
//                   <>
//                     <tr key={index} className="hover:bg-gray-50">
//                       <td className="border p-2">{item.itemCode}</td>
//                       <td className="border p-2">{item.itemName}</td>
//                       <td className="border p-2">{item.itemDescription || '-'}</td>
//                       <td className="border p-2">
//                         {item.warehouseCode} - {item.warehouseName}
//                       </td>
//                       <td className="border p-2 text-center">
//                         <div className="flex flex-col">
//                           <span>Ordered: {item.quantity}</span>
//                           {item.allowedQuantity > 0 && (
//                             <span className="text-sm text-green-600">
//                               Allowed: {item.allowedQuantity}
//                             </span>
//                           )}
//                         </div>
//                       </td>
//                       <td className="border p-2 text-right">{formatCurrency(item.unitPrice)}</td>
//                       <td className="border p-2 text-right">{formatCurrency(item.discount)}</td>
//                       <td className="border p-2 text-right font-medium">
//                         {formatCurrency(item.totalAmount)}
//                       </td>
//                       <td className="border p-2 text-center">
//                         {item.managedByBatch ? "Batch Managed" : "Not Batch Managed"}
//                       </td>
//                     </tr>
                    
//                     {/* Batch details if managed by batch */}
//                     {item.managedByBatch && item.batches && item.batches.length > 0 && (
//                       <tr>
//                         <td colSpan="9" className="border p-2 bg-gray-50">
//                           <h3 className="font-semibold mb-2">Batch Details:</h3>
//                           <table className="min-w-full bg-gray-100">
//                             <thead>
//                               <tr>
//                                 <th className="p-2 text-left">Batch Code</th>
//                                 <th className="p-2 text-left">Expiry Date</th>
//                                 <th className="p-2 text-left">Manufacturer</th>
//                                 <th className="p-2 text-center">Allocated Qty</th>
//                                 <th className="p-2 text-center">Available Qty</th>
//                               </tr>
//                             </thead>
//                             <tbody>
//                               {item.batches.map((batch, batchIndex) => (
//                                 <tr key={batchIndex} className="hover:bg-gray-200">
//                                   <td className="p-2">{batch.batchCode}</td>
//                                   <td className="p-2">{formatDate(batch.expiryDate)}</td>
//                                   <td className="p-2">{batch.manufacturer}</td>
//                                   <td className="p-2 text-center">{batch.allocatedQuantity}</td>
//                                   <td className="p-2 text-center">{batch.availableQuantity}</td>
//                                 </tr>
//                               ))}
//                             </tbody>
//                           </table>
//                         </td>
//                       </tr>
//                     )}
                    
//                     {item.errorMessage && (
//                       <tr>
//                         <td colSpan="9" className="border p-2 bg-red-50 text-red-700">
//                           <strong>Error:</strong> {item.errorMessage}
//                         </td>
//                       </tr>
//                     )}
//                   </>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         ) : (
//           <p className="text-center text-gray-500 py-4">No items available.</p>
//         )}
//       </div>

//       <div className="flex justify-end space-x-4">
//         <Link href="/admin/sales-invoice-view">
//           <button className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition">
//             Back to List
//           </button>
//         </Link>
//         <Link href={`/admin/sales-invoice-view/new?editId=${invoice._id}`}>
//           <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition">
//             Edit Invoice
//           </button>
//         </Link>
//       </div>
//     </div>
//   );
// }



// 'use client';

// import Link from 'next/link';
// import axios from 'axios';
// import { useParams } from 'next/navigation';
// import { useEffect, useState } from 'react';

// export default function InvoiceDetail() {
//   const { id } = useParams();
//   const [order, setOrder] = useState([]);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const fetchOrder = async () => {
//       try {
//         const res = await axios.get(`/api/sales-invoice/${id}`);
//         console.log(res.data.data)
//         setOrder(res.data.data);
//       } catch (error) {
//         console.error('Failed to fetch purchase-order:', error);
//         setError('Failed to fetch purchase-order');
//       }
//     };

//     if (id) {
//         fetchOrder();
//     }
//   }, [id]);

//   if (error) {
//     return <p>{error}</p>;
//   }

//   if (!order) {
//     return <p>Loading...</p>;
//   }

//   return (
//     <div className="container mx-auto p-6">
//       <Link href="/admin/sales-invoice-view">
//         <button className="mb-4 px-4 py-2 bg-gray-300 rounded">Back to Order List</button>
//       </Link>
//       <h1 className="text-3xl font-bold mb-6">Order Detail</h1>
//       <div className="bg-white shadow-md rounded p-6">
//         <p><strong>order Number:</strong> {order.orderNumber}</p>
//         <p><strong>Supplier Name:</strong> {order.supplierName}</p>
//         <p><strong>order Date:</strong> {new Date(order.orderDate).toLocaleDateString()}</p>
//         <p><strong>Status:</strong> {order.status}</p>
//         <p><strong>Grand Total:</strong> {order.grandTotal}</p>
//         <p><strong>Remarks:</strong> {order.remarks}</p>
//         <h2 className="text-2xl font-semibold mt-6 mb-2">Items</h2>
//         {order.items && order.items.length > 0 ? (
//           <table className="min-w-full bg-white border border-gray-300">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="border p-2">Item Name</th>
//                 <th className="border p-2">Quantity</th>
//                 <th className="border p-2">Unit Price</th>
//                 <th className="border p-2">Discount</th>
//                 <th className="border p-2">Total Amount</th>
//               </tr>
//             </thead>
//             <tbody>
//               {order.items.map((item, index) => (
//                 <tr key={index} className="text-center">
//                   <td className="border p-2">{item.itemName}</td>
//                   <td className="border p-2">{item.quantity}</td>
//                   <td className="border p-2">{item.unitPrice}</td>
//                   <td className="border p-2">{item.discount}</td>
//                   <td className="border p-2">{item.totalAmount}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         ) : (
//           <p>No items available.</p>
//         )}
//       </div>
//       <div className="mt-4">
//         <Link href={`/admin/sales-invoice-view/new?editId=${order._id}`}>
//           <button className="px-4 py-2 bg-blue-600 text-white rounded">Edit order</button>
//         </Link>
//       </div>
//     </div>
//   );
// }
