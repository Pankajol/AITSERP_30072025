"use client";

import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FaArrowLeft, FaEdit, FaUser, FaCalendarAlt,
  FaBoxOpen, FaCalculator, FaPaperclip, FaMapMarkerAlt
} from "react-icons/fa";

export default function DeliveryDetail() {
  const { id } = useParams();
  const router  = useRouter();
  const [delivery, setDelivery] = useState(null);
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchDelivery = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await axios.get(`/api/delivery/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.data) setDelivery(res.data.data);
        else setError("Delivery not found");
      } catch (err) {
        console.error(err);
        setError("Failed to fetch delivery");
      } finally {
        setLoading(false);
      }
    };
    fetchDelivery();
  }, [id]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(value || 0);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const StatusBadge = ({ status }) => {
    const map = {
      Delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
      Closed:    "bg-emerald-50 text-emerald-700 border-emerald-200",
      Shipped:   "bg-violet-50 text-violet-700 border-violet-200",
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
        <p className="text-sm text-gray-400">Loading delivery...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><p className="text-red-500 font-semibold">{error}</p>
        <button onClick={() => router.push("/admin/delivery-view")} className="mt-4 text-indigo-600 text-sm hover:underline">← Back to deliveries</button>
      </div>
    </div>
  );

  if (!delivery) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        <button onClick={() => router.push("/admin/delivery-view")}
          className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4 hover:text-indigo-800 transition-colors">
          <FaArrowLeft className="text-xs" /> Back to Deliveries
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Delivery Note</h1>
              <StatusBadge status={delivery.status} />
            </div>
            <p className="text-sm text-gray-400">
              <span className="font-mono font-bold text-indigo-600">{delivery.documentNumber || "—"}</span>
              {" · "} {formatDate(delivery.deliveryDate)}
            </p>
          </div>
          <button onClick={() => router.push(`/admin/delivery-view/new?editId=${delivery._id}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
            <FaEdit className="text-xs" /> Edit Delivery
          </button>
        </div>

        {/* Customer */}
        <SectionCard icon={FaUser} title="Customer Information" color="indigo">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <InfoRow label="Customer Code"   value={delivery.customerCode} />
            <InfoRow label="Customer Name"   value={delivery.customerName} />
            <InfoRow label="Contact Person"  value={delivery.contactPerson} />
            <InfoRow label="Sales Employee"  value={delivery.salesEmployee} />
          </div>
        </SectionCard>

        {/* Dates */}
        <SectionCard icon={FaCalendarAlt} title="Delivery Dates & Status" color="blue">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <InfoRow label="Delivery Date"   value={formatDate(delivery.deliveryDate)} />
            <InfoRow label="Expected Date"   value={formatDate(delivery.expectedDeliveryDate)} />
            <InfoRow label="Reference No."   value={delivery.refNumber} />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Status</span>
              <StatusBadge status={delivery.status} />
            </div>
          </div>
        </SectionCard>

        {/* Addresses */}
        {(delivery.billingAddress || delivery.shippingAddress) && (
          <SectionCard icon={FaMapMarkerAlt} title="Address Information" color="violet">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {delivery.billingAddress && (
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-blue-500 mb-2">Billing Address</p>
                  <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 text-sm text-gray-700 space-y-0.5">
                    {delivery.billingAddress.address1 && <p>{delivery.billingAddress.address1}</p>}
                    {delivery.billingAddress.address2 && <p>{delivery.billingAddress.address2}</p>}
                    <p>{[delivery.billingAddress.city, delivery.billingAddress.state, delivery.billingAddress.zip].filter(Boolean).join(", ")}</p>
                    {delivery.billingAddress.country  && <p>{delivery.billingAddress.country}</p>}
                  </div>
                </div>
              )}
              {delivery.shippingAddress && (
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-500 mb-2">Shipping Address</p>
                  <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 text-sm text-gray-700 space-y-0.5">
                    {delivery.shippingAddress.address1 && <p>{delivery.shippingAddress.address1}</p>}
                    {delivery.shippingAddress.address2 && <p>{delivery.shippingAddress.address2}</p>}
                    <p>{[delivery.shippingAddress.city, delivery.shippingAddress.state, delivery.shippingAddress.zip].filter(Boolean).join(", ")}</p>
                    {delivery.shippingAddress.country  && <p>{delivery.shippingAddress.country}</p>}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Items */}
        <SectionCard icon={FaBoxOpen} title="Line Items" color="emerald">
          {delivery.items && delivery.items.length > 0 ? (
            <>
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
                    {delivery.items.map((item, index) => (
                      <tr key={index} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-3 py-3 text-xs text-gray-300 font-mono">{index + 1}</td>
                        <td className="px-3 py-3"><span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{item.itemCode || "—"}</span></td>
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
              <div className="md:hidden space-y-3">
                {delivery.items.map((item, index) => (
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
            <div className="text-center py-8 text-gray-300"><div className="text-3xl mb-2">📦</div><p className="text-sm">No items available</p></div>
          )}
        </SectionCard>

        {/* Financial Summary */}
        <SectionCard icon={FaCalculator} title="Financial Summary" color="amber">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {[
              { label: "Total Before Discount", value: formatCurrency(delivery.totalBeforeDiscount) },
              { label: "GST Total",             value: formatCurrency(delivery.gstTotal) },
              { label: "Freight",               value: formatCurrency(delivery.freight) },
              { label: "Rounding",              value: formatCurrency(delivery.rounding) },
              { label: "Total Down Payment",    value: formatCurrency(delivery.totalDownPayment) },
              { label: "Applied Amounts",       value: formatCurrency(delivery.appliedAmounts) },
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
              <p className="text-2xl font-black">{formatCurrency(delivery.grandTotal)}</p>
            </div>
            <div className="bg-gray-100 rounded-2xl p-4">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Open Balance</p>
              <p className="text-2xl font-black text-gray-800">{formatCurrency(delivery.openBalance)}</p>
            </div>
          </div>
          {delivery.remarks && (
            <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-xl p-4">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-yellow-600 mb-1">Remarks</p>
              <p className="text-sm text-gray-700">{delivery.remarks}</p>
            </div>
          )}
        </SectionCard>

        {/* Attachments */}
        {delivery.attachments && delivery.attachments.length > 0 && (
          <SectionCard icon={FaPaperclip} title="Attachments" color="gray">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {delivery.attachments.map((att, i) => {
                const isImage = att.fileType?.startsWith("image/");
                const isPDF   = att.fileType === "application/pdf" || att.fileName?.toLowerCase().endsWith(".pdf");
                return (
                  <div key={i} className="border rounded-xl p-2 bg-gray-50 hover:shadow-md transition-all">
                    <div className="h-24 flex items-center justify-center overflow-hidden rounded-lg mb-2">
                      {isImage ? <img src={att.fileUrl} alt={att.fileName} className="h-full object-cover w-full rounded-lg" />
                        : isPDF ? <iframe src={att.fileUrl} className="w-full h-full rounded-lg" title="PDF" />
                        : <div className="text-3xl">📎</div>}
                    </div>
                    <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="block text-[10px] text-indigo-600 truncate font-semibold hover:underline">{att.fileName}</a>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 pb-10">
          <button onClick={() => router.push("/admin/delivery-view")}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">
            <FaArrowLeft className="text-xs" /> Back to List
          </button>
          <button onClick={() => router.push(`/admin/delivery-view/new?editId=${delivery._id}`)}
            className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            <FaEdit className="text-xs" /> Edit Delivery
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
// import { useEffect, useState  } from 'react';
// import React from 'react';

// export default function InvoiceDetail({ params }) {
//   // Use params directly from the function argument
  
//   const { id } = useParams();
//   const [delivery, setDelivery] = useState(null);
//   const [error, setError] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [order, setOrder] = useState({ items: [] });

// useEffect(() => {
//   const fetchDeliveryAndOrder = async () => {
//     try {
//       setLoading(true);

//       // ✅ Fetch delivery
//       const res = await axios.get(`/api/sales-delivery/${id}`);
//       if (res.data?.data) {
//         const deliveryData = res.data.data;
//         setDelivery(deliveryData);

//         // ✅ If delivery has salesOrderId, fetch related order
//         if (deliveryData.salesOrderId) {
//           const orderRes = await axios.get(`/api/sales-order/${deliveryData.salesOrderId}`);
//           if (orderRes.data?.data) {
//             setOrder(orderRes.data.data);
//           }
//         }
//       } else {
//         setError("Delivery not found");
//       }
//     } catch (error) {
//       console.error("Failed to fetch delivery:", error);
//       setError("Failed to fetch delivery details");
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (id) fetchDeliveryAndOrder();
// }, [id]);


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

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center h-screen">
//         <div className="text-xl">Loading delivery details...</div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="container mx-auto p-6">
//         <p className="text-red-600 text-xl">{error}</p>
//         <Link href="/admin/delivery-view">
//           <button className="mt-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded">
//             Back to Delivery List
//           </button>
//         </Link>
//       </div>
//     );
//   }

//   if (!delivery) {
//     return (
//       <div className="container mx-auto p-6">
//         <p>Delivery not found</p>
//         <Link href="/admin/delivery-view">
//           <button className="mt-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded">
//             Back to Delivery List
//           </button>
//         </Link>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto p-6">
//       <Link href="/admin/delivery-view">
//         <button className="mb-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition">
//           ← Back to Delivery List
//         </button>
//       </Link>
      
//       <h1 className="text-3xl font-bold mb-6">Delivery Details</h1>
      
//       <div className="bg-white shadow-md rounded-lg p-6 mb-6">
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
//           <div>
//             <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
//             <div className="space-y-2">
//               <p><strong>Customer Code:</strong> {delivery.customerCode}</p>
//               <p><strong>Customer Name:</strong> {delivery.customerName}</p>
//               <p><strong>Contact Person:</strong> {delivery.contactPerson}</p>
//               <p><strong>Sales Employee:</strong> {delivery.salesEmployee || '-'}</p>
//             </div>
//           </div>
          
//           <div>
//             <h2 className="text-xl font-semibold mb-4">Delivery Information</h2>
//             <div className="space-y-2">
//               <p><strong>Reference Number:</strong> {delivery.refNumber || '-'}</p>
//               <p><strong>Order Date:</strong> {formatDate(delivery.orderDate)}</p>
//               <p><strong>Posting Date:</strong> {formatDate(delivery.postingDate)}</p>
//               <p><strong>Expected Delivery:</strong> {formatDate(delivery.expectedDeliveryDate)}</p>
//               <p>
//                 <strong>Status:</strong> 
//                 <span className={`ml-2 px-2 py-1 rounded text-sm ${
//                   delivery.status === "Confirmed" 
//                     ? "bg-green-200 text-green-800" 
//                     : "bg-yellow-200 text-yellow-800"
//                 }`}>
//                   {delivery.status}
//                 </span>
//               </p>
//               <p><strong>From Quote:</strong> {delivery.fromQuote ? 'Yes' : 'No'}</p>
//             </div>
//           </div>
//         </div>
        
//         <div className="mt-4 pt-4 border-t">
//           <h2 className="text-xl font-semibold mb-2">Financial Summary</h2>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div className="space-y-1">
//               <p><strong>Total Before Discount:</strong> {formatCurrency(delivery.totalBeforeDiscount)}</p>
//               <p><strong>Freight:</strong> {formatCurrency(delivery.freight)}</p>
//               <p><strong>Rounding:</strong> {formatCurrency(delivery.rounding)}</p>
//             </div>
//             <div className="space-y-1">
//               <p><strong>Total Down Payment:</strong> {formatCurrency(delivery.totalDownPayment)}</p>
//               <p><strong>Applied Amounts:</strong> {formatCurrency(delivery.appliedAmounts)}</p>
//               <p><strong>Open Balance:</strong> {formatCurrency(delivery.openBalance)}</p>
//               <p><strong>GST Total:</strong> {formatCurrency(delivery.gstTotal)}</p>
//             </div>
//           </div>
//           <div className="mt-4 pt-4 border-t">
//             <p className="text-xl font-bold">
//               <strong>Grand Total:</strong> {formatCurrency(delivery.grandTotal)}
//             </p>
//           </div>
//         </div>
        
//         {delivery.remarks && (
//           <div className="mt-6 pt-4 border-t">
//             <h2 className="text-xl font-semibold mb-2">Remarks</h2>
//             <p className="text-gray-700">{delivery.remarks}</p>
//           </div>
//         )}
//       </div>

//    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
//   <h2 className="text-2xl font-semibold mb-4">Delivery Items</h2>
//   {delivery.items && delivery.items.length > 0 ? (
//     <div className="overflow-x-auto">
//       <table className="min-w-full border-collapse">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="border p-2 text-left">Item Code</th>
//             <th className="border p-2 text-left">Item Name</th>
//             <th className="border p-2 text-left">Description</th>
//             <th className="border p-2 text-left">Warehouse</th>
//             <th className="border p-2 text-center">Quantity</th>
//             <th className="border p-2 text-center">Unit Price</th>
//             <th className="border p-2 text-center">Discount</th>
//             <th className="border p-2 text-center">Total</th>
//             <th className="border p-2 text-center">Batch Details</th>
//           </tr>
//         </thead>
//         <tbody>
//           {delivery.items.map((item, index) => (
//             <React.Fragment key={item._id || `item-${index}`}>
//               {/* Main Item Row */}
//               <tr className="hover:bg-gray-50">
//                 <td className="border p-2">{item.itemCode}</td>
//                 <td className="border p-2">{item.itemName}</td>
//                 <td className="border p-2">{item.itemDescription}</td>
//                 <td className="border p-2">
//                   {item.warehouseCode} - {item.warehouseName}
//                 </td>
//                 <td className="border p-2 text-center">
//                   <div className="flex flex-col">
//                     <span>Ordered: {item.quantity}</span>
//                     {item.allowedQuantity > 0 && (
//                       <span className="text-sm text-green-600">
//                         Allowed: {item.allowedQuantity}
//                       </span>
//                     )}
//                   </div>
//                 </td>
//                 <td className="border p-2 text-right">{formatCurrency(item.unitPrice)}</td>
//                 <td className="border p-2 text-right">{formatCurrency(item.discount)}</td>
//                 <td className="border p-2 text-right font-medium">
//                   {formatCurrency(item.totalAmount)}
//                 </td>
//                 <td className="border p-2 text-center">
//                   {item.managedByBatch ? "Batch Managed" : "Not Batch Managed"}
//                 </td>
//               </tr>

//               {/* Batch Details */}
//               {item.managedByBatch && item.batches && item.batches.length > 0 && (
//                 <tr key={`batch-${item._id || index}`}>
//                   <td colSpan="9" className="border p-2 bg-gray-50">
//                     <h3 className="font-semibold mb-2">Batch Details:</h3>
//                     <table className="min-w-full bg-gray-100">
//                       <thead>
//                         <tr>
//                           <th className="p-2 text-left">Batch Code</th>
//                           <th className="p-2 text-left">Expiry Date</th>
//                           <th className="p-2 text-left">Manufacturer</th>
//                           <th className="p-2 text-center">Allocated Qty</th>
//                           <th className="p-2 text-center">Available Qty</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {item.batches.map((batch, batchIndex) => (
//                           <tr key={batch._id || `batch-${item._id}-${batchIndex}`}>
//                             <td className="p-2">{batch.batchCode}</td>
//                             <td className="p-2">{formatDate(batch.expiryDate)}</td>
//                             <td className="p-2">{batch.manufacturer}</td>
//                             <td className="p-2 text-center">{batch.allocatedQuantity}</td>
//                             <td className="p-2 text-center">{batch.availableQuantity}</td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </td>
//                 </tr>
//               )}

//               {/* Error Message Row */}
//               {item.errorMessage && (
//                 <tr key={`error-${item._id || index}`}>
//                   <td colSpan="9" className="border p-2 bg-red-50 text-red-700">
//                     <strong>Error:</strong> {item.errorMessage}
//                   </td>
//                 </tr>
//               )}
//             </React.Fragment>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   ) : (
//     <p className="text-center text-gray-500 py-4">No items available.</p>
//   )}
// </div>

//        {/* <div className="bg-white shadow-md rounded-lg p-6 mb-6">
//         <h2 className="text-2xl font-semibold mb-4">Order Items</h2>
//         {order.items && order.items.length > 0 ? (
//           <div className="overflow-x-auto">
//             <table className="min-w-full border-collapse">
//               <thead className="bg-gray-100">
//                 <tr>
//                   <th className="border p-2 text-left">Item Code</th>
//                   <th className="border p-2 text-left">Item Name</th>
//                   <th className="border p-2 text-left">Description</th>
//                   <th className="border p-2 text-left">Warehouse</th>
//                   <th className="border p-2 text-center">Qty</th>
//                   <th className="border p-2 text-center">Unit Price</th>
//                   <th className="border p-2 text-center">Discount</th>
//                   <th className="border p-2 text-center">Tax</th>
//                   <th className="border p-2 text-center">Total</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {order.items.map((item, index) => (
//                   <tr key={index} className="hover:bg-gray-50">
//                     <td className="border p-2">{item.itemCode}</td>
//                     <td className="border p-2">{item.itemName}</td>
//                     <td className="border p-2">{item.itemDescription}</td>
//                     <td className="border p-2">
//                       {item.warehouseCode} - {item.warehouseName}
//                     </td>
//                     <td className="border p-2 text-center">
//                       <div className="flex flex-col">
//                         <span>Ordered: {item.quantity}</span>
//                         {item.allowedQuantity > 0 && (
//                           <span className="text-sm text-green-600">
//                             Allowed: {item.allowedQuantity}
//                           </span>
//                         )}
//                         {item.receivedQuantity > 0 && (
//                           <span className="text-sm text-blue-600">
//                             Received: {item.receivedQuantity}
//                           </span>
//                         )}
//                       </div>
//                     </td>
//                     <td className="border p-2 text-right">{formatCurrency(item.unitPrice)}</td>
//                     <td className="border p-2 text-right">{formatCurrency(item.discount)}</td>
//                     <td className="border p-2 text-center">
//                       <div className="flex flex-col">
//                         <span>{item.taxOption}: {item.gstRate}%</span>
//                         <span className="text-xs">
//                           {formatCurrency(item.gstAmount)}
//                         </span>
//                       </div>
//                     </td>
//                     <td className="border p-2 text-right font-medium">
//                       {formatCurrency(item.totalAmount)}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         ) : (
//           <p className="text-center text-gray-500 py-4">No items available.</p>
//         )}
//       </div> */}


//         <div className="mt-8 pt-4 border-t-2 border-gray-300">
//             <h3 className="text-xl font-semibold mb-2">Attachments</h3>
//             {delivery.attachments && delivery.attachments.length > 0 ? (
//               <ul className="list-disc pl-5 space-y-2">
//                 {delivery.attachments.map((attachment, index) => {
//                   const isImage = attachment.fileType && attachment.fileType.startsWith("image/");
//                   const isPDF = attachment.fileType === "application/pdf" || attachment.fileName.toLowerCase().endsWith(".pdf");
//                   return (
//                     <li key={index}>
//                       <p className="font-semibold mb-2">{attachment.fileName}</p>
//                       {isImage ? (
//                         <img src={attachment.fileUrl} alt={attachment.fileName} className="max-w-full h-auto rounded mb-2" />
//                       ) : isPDF ? (
//                         <iframe src={attachment.fileUrl} className="w-full h-[400px] rounded mb-2" title="PDF Preview"></iframe>
//                       ) : (
//                         <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
//                           Open {attachment.fileName} in a new tab
//                         </a>
//                       )}
//                       {!isImage && !isPDF && (
//                         <p className="text-sm text-gray-500">Unsupported file type for preview.</p>
//                       )}
//                     </li>
//                   );
//                 })}
//               </ul>
//             ) : (
//               <p className="text-gray-500">No attachments available.</p>
//             )}
//           </div>
      

//       <div className="flex justify-end space-x-4">
//         <Link href="/admin/delivery-view">
//           <button className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition">
//             Back to List
//           </button>
//         </Link>
//         <Link href={`/admin/delivery-view/new?editId=${delivery._id}`}>
//           <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition">
//             Edit Delivery
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
//         const res = await axios.get(`/api/sales-delivery/${id}`);
//         console.log(res.data.data)
//         setOrder(res.data.data);
//       } catch (error) {
//         console.error('Failed to fetch sales-order:', error);
//         setError('Failed to fetch sales-order');
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
//       <Link href="/admin/delivery-view">
//         <button className="mb-4 px-4 py-2 bg-gray-300 rounded">Back to Order List</button>
//       </Link>
//       <h1 className="text-3xl font-bold mb-6">Order Detail</h1>
      
//       <div className="bg-white shadow-md rounded p-6">
//         <p><strong>order Number:</strong> {order.orderNumber}</p>
//         <p><strong>Supplier Name:</strong> {order.supplierName}</p>
//         <p><strong>order Date:</strong> {new Date(order.postingDate).toLocaleDateString()}</p>
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
//         <Link href={`/admin/delivery-view/new?editId=${order._id}`}>
//           <button className="px-4 py-2 bg-blue-600 text-white rounded">Edit order</button>
//         </Link>
//       </div>
//     </div>
//   );
// }
