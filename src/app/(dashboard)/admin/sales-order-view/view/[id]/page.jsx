'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  FaArrowLeft, FaEdit, FaUser, FaCalendarAlt, FaBoxOpen, 
  FaCalculator, FaPaperclip, FaInfoCircle, FaFilePdf, 
  FaMapMarkerAlt, FaWarehouse, FaHistory 
} from 'react-icons/fa';

// --- UI Helpers ---
const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 2
  }).format(value || 0);
};

const Lbl = ({ text }) => (
  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{text}</p>
);

const DetailField = ({ label, value, color = "text-gray-900" }) => (
  <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
    <Lbl text={label} />
    <p className={`text-sm font-bold ${color}`}>{value || "—"}</p>
  </div>
);

const SectionHeader = ({ icon: Icon, title, color = "indigo" }) => (
  <div className={`flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-${color}-50/30`}>
    <div className={`w-8 h-8 rounded-xl bg-${color}-100 flex items-center justify-center text-${color}-600 text-sm`}>
      <Icon />
    </div>
    <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">{title}</h3>
  </div>
);

// --- Main Component Wrapper (Required for useSearchParams) ---
export default function SalesOrderDetailWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SalesOrderDetail />
    </Suspense>
  );
}

function SalesOrderDetail() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // NOTE: In a Detail page, we usually fetch by the 'id' from params.
  // The 'editId' logic you added is usually meant for the "New/Form" page.
  const targetId = searchParams.get("editId") || id;

  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!targetId) return;
      
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/sales-order/${targetId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data?.success || res.data?.data) {
          setOrder(res.data.data || res.data);
        } else {
          setError('Order details not found');
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.response?.data?.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [targetId]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Loading comprehensive data...</p>
    </div>
  );

  if (error || !order) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-50 text-center">
        <FaInfoCircle className="text-red-500 text-5xl mx-auto mb-4" />
        <h2 className="text-xl font-black text-gray-900 mb-2 uppercase">Access Error</h2>
        <p className="text-gray-500 mb-6 font-medium">{error || "Sales Order not found"}</p>
        <button onClick={() => router.push("/admin/sales-order-view")} className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold transition-all hover:bg-indigo-700">
          Return to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        
        {/* --- Top Navigation --- */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <button onClick={() => router.push("/admin/sales-order-view")} 
            className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest hover:text-indigo-800 transition-colors">
            <FaArrowLeft /> Back to List
          </button>
          
          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border-2 ${
              order.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
            }`}>
              {order.status}
            </span>
            {/* Edit Link pointing to the Form page */}
            {/* <Link href={`/admin/sales-order-view/new?editId=${order._id}`}>
              <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm">
                <FaEdit /> Edit Order
              </button>
            </Link> */}
          </div>
        </div>

        {/* --- Title --- */}
        <div className="mb-10 text-center sm:text-left">
          <p className="text-indigo-600 font-black text-[10px] tracking-[0.3em] uppercase mb-1">Internal Reference</p>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">
            {order.documentNumberOrder || order.refNumber || "DRAFT-ORDER"}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* --- LEFT COLUMN --- */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaUser} title="Entity Information" color="indigo" />
              <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailField label="Customer Name" value={order.customerName} />
                <DetailField label="Customer Code" value={order.customerCode} />
                <DetailField label="Contact Person" value={order.contactPerson} />
                <DetailField label="Sales Employee" value={order.salesEmployee} color="text-indigo-600" />
              </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaMapMarkerAlt} title="Logistics / Addresses" color="blue" />
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <Lbl text="Billing Address" />
                  <div className="text-sm font-bold text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200">
                    {order.billingAddress?.address1 ? (
                      <>
                        {order.billingAddress.address1}<br/>
                        {order.billingAddress.city}, {order.billingAddress.state} - {order.billingAddress.zip}
                      </>
                    ) : "No Billing Address Stated"}
                  </div>
                </div>
                <div>
                  <Lbl text="Shipping Address" />
                  <div className="text-sm font-bold text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200">
                  {order.shippingAddress?.address1 ? (
                      <>
                        {order.shippingAddress.address1}<br/>
                        {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.zip}
                      </>
                    ) : "No Shipping Address Stated"}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaBoxOpen} title="Itemized Inventory" color="emerald" />
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50">
                    <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <th className="px-8 py-4 text-left">Product Detail</th>
                      <th className="px-6 py-4 text-center">Qty</th>
                      <th className="px-6 py-4 text-center">Tax / Disc</th>
                      <th className="px-8 py-4 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {order.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-8 py-6">
                          <p className="text-sm font-black text-gray-900">{item.itemName}</p>
                          <p className="text-[11px] text-indigo-500 font-mono font-bold mt-1">{item.itemCode}</p>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <p className="text-base font-black text-gray-800">{item.quantity}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">{item.warehouseName || 'Main'}</p>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <p className="text-[11px] font-black text-gray-700">{item.taxOption}: {item.gstRate}%</p>
                          <p className="text-[10px] text-red-500 font-bold">-{formatCurrency(item.discount)}</p>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <p className="text-sm font-black text-gray-900">{formatCurrency(item.totalAmount)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* --- RIGHT COLUMN --- */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-gray-900 rounded-[2.5rem] shadow-2xl p-8 text-white">
              <div className="flex items-center gap-2 mb-8 opacity-50">
                <FaCalculator />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Summary</h3>
              </div>
              <div className="space-y-5">
                <div className="flex justify-between items-center text-xs">
                  <span className="opacity-50 font-bold uppercase">Subtotal</span>
                  <span className="font-mono">{formatCurrency(order.totalBeforeDiscount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-gray-800 pb-5">
                  <span className="opacity-50 font-bold uppercase text-emerald-400">Tax</span>
                  <span className="font-mono text-emerald-400">{formatCurrency(order.gstTotal)}</span>
                </div>
                <div className="pt-4">
                  <Lbl text="Payable Balance" />
                  <span className="text-4xl font-black tracking-tighter text-indigo-400">{formatCurrency(order.grandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaCalendarAlt} title="Timeline" color="blue" />
              <div className="p-6 space-y-6">
                <DetailField label="Creation Date" value={formatDate(order.orderDate)} />
                <DetailField label="Expected Fulfillment" value={formatDate(order.expectedDeliveryDate)} color="text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaPaperclip} title="Documents" color="purple" />
              <div className="p-6">
                {order.attachments?.length > 0 ? (
                  <div className="space-y-3">
                    {order.attachments.map((file, idx) => (
                      <a key={idx} href={file.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all">
                        <FaFilePdf className="text-red-500" size={18} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-gray-900 truncate">{file.fileName}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 font-bold text-center py-4">NO ATTACHMENTS</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaHistory} title="System Audit" color="orange" />
              <div className="p-6 space-y-4">
                <DetailField label="Created By User ID" value={order.createdBy} />
                <DetailField label="Source Method" value={order.fromQuote ? "Quotation" : "Direct Entry"} />
              </div>
            </div>
          </div>
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
//   const [order, setOrder] = useState(null);
//   const [error, setError] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchOrder = async () => {
//       try {
//         setLoading(true);
//         const res = await axios.get(`/api/sales-order/${id}`);
//         if (res.data && res.data.data) {
//           setOrder(res.data.data);
//         } else {
//           setError('Order not found');
//         }
//       } catch (error) {
//         console.error('Failed to fetch sales-order:', error);
//         setError('Failed to fetch sales-order');
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (id) {
//       fetchOrder();
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

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center h-screen">
//         <div className="text-xl">Loading...</div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="container mx-auto p-6">
//         <p className="text-red-600 text-xl">{error}</p>
//       </div>
//     );
//   }

//   if (!order) {
//     return <p>Order not found</p>;
//   }

//   return (
//     <div className="container mx-auto p-6">
//       <Link href="/admin/sales-order-view">
//         <button className="mb-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition">
//           ← Back to Order List
//         </button>
//       </Link>
      
//       <h1 className="text-3xl font-bold mb-6">Sales Order Details</h1>
      
//       <div className="bg-white shadow-md rounded-lg p-6 mb-6">
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
//           <div>
//             <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
//             <div className="space-y-2">
//               <p><strong>Customer Code:</strong> {order.customerCode}</p>
//               <p><strong>Customer Name:</strong> {order.customerName}</p>
//               <p><strong>Contact Person:</strong> {order.contactPerson}</p>
//               <p><strong>Sales Employee:</strong> {order.salesEmployee || '-'}</p>
//             </div>
//           </div>
          
//           <div>
//             <h2 className="text-xl font-semibold mb-4">Order Information</h2>
//             <div className="space-y-2">
//               <p><strong>Order Number:</strong> {order.refNumber}</p>
//               <p><strong>Order Date:</strong> {formatDate(order.orderDate)}</p>
//               <p><strong>Expected Delivery:</strong> {formatDate(order.expectedDeliveryDate)}</p>
//               <p>
//                 <strong>Status:</strong> 
//                 <span className={`ml-2 px-2 py-1 rounded text-sm ${
//                   order.status === "Confirmed" 
//                     ? "bg-green-200 text-green-800" 
//                     : "bg-yellow-200 text-yellow-800"
//                 }`}>
//                   {order.status}
//                 </span>
//               </p>
//               <p><strong>From Quote:</strong> {order.fromQuote ? 'Yes' : 'No'}</p>
//             </div>
//           </div>
//         </div>
        
//         {/* Address Information */}
//         {(order.billingAddress || order.shippingAddress) && (
//           <div className="mt-6 pt-4 border-t">
//             <h2 className="text-xl font-semibold mb-4">Address Information</h2>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               {/* Billing Address */}
//               {order.billingAddress && (
//                 <div>
//                   <h3 className="font-medium mb-2 text-blue-600">Billing Address</h3>
//                   <div className="bg-gray-50 p-3 rounded border">
//                     {order.billingAddress.address1 && <p>{order.billingAddress.address1}</p>}
//                     {order.billingAddress.address2 && <p>{order.billingAddress.address2}</p>}
//                     <p>
//                       {[order.billingAddress.city, order.billingAddress.state, order.billingAddress.zip]
//                         .filter(Boolean).join(', ')}
//                     </p>
//                     {order.billingAddress.country && <p>{order.billingAddress.country}</p>}
//                   </div>
//                 </div>
//               )}
              
//               {/* Shipping Address */}
//               {order.shippingAddress && (
//                 <div>
//                   <h3 className="font-medium mb-2 text-green-600">Shipping Address</h3>
//                   <div className="bg-gray-50 p-3 rounded border">
//                     {order.shippingAddress.address1 && <p>{order.shippingAddress.address1}</p>}
//                     {order.shippingAddress.address2 && <p>{order.shippingAddress.address2}</p>}
//                     <p>
//                       {[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.zip]
//                         .filter(Boolean).join(', ')}
//                     </p>
//                     {order.shippingAddress.country && <p>{order.shippingAddress.country}</p>}
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         )}
        
//         <div className="mt-4 pt-4 border-t">
//           <h2 className="text-xl font-semibold mb-2">Financial Summary</h2>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div className="space-y-1">
//               <p><strong>Total Before Discount:</strong> {formatCurrency(order.totalBeforeDiscount)}</p>
//               <p><strong>Freight:</strong> {formatCurrency(order.freight)}</p>
//               <p><strong>Rounding:</strong> {formatCurrency(order.rounding)}</p>
//             </div>
//             <div className="space-y-1">
//               <p><strong>Total Down Payment:</strong> {formatCurrency(order.totalDownPayment)}</p>
//               <p><strong>Applied Amounts:</strong> {formatCurrency(order.appliedAmounts)}</p>
//               <p><strong>Open Balance:</strong> {formatCurrency(order.openBalance)}</p>
//             </div>
//           </div>
//           <div className="mt-4 pt-4 border-t">
//             <p className="text-xl font-bold">
//               <strong>Grand Total:</strong> {formatCurrency(order.grandTotal)}
//             </p>
//           </div>
//         </div>
        
//         {order.remarks && (
//           <div className="mt-6 pt-4 border-t">
//             <h2 className="text-xl font-semibold mb-2">Remarks</h2>
//             <p className="text-gray-700">{order.remarks}</p>
//           </div>
//         )}
//       </div>

//       <div className="bg-white shadow-md rounded-lg p-6 mb-6">
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
//       </div>
//          <div className="mt-8 pt-4 border-t-2 border-gray-300">
//             <h3 className="text-xl font-semibold mb-2">Attachments</h3>
//             {order.attachments && order.attachments.length > 0 ? (
//               <ul className="list-disc pl-5 space-y-2">
//                 {order.attachments.map((attachment, index) => {
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
//         <Link href="/admin/sales-order-view">
//           <button className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition">
//             Back to List
//           </button>
//         </Link>
//         <Link href={`/admin/sales-order-view/new?editId=${order._id}`}>
//           <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition">
//             Edit Order
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
//         const res = await axios.get(`/api/sales-order/${id}`);
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
//       <Link href="/admin/sales-order-view">
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
//         <Link href={`/admin/sales-order-view/new?editId=${order._id}`}>
//           <button className="px-4 py-2 bg-blue-600 text-white rounded">Edit order</button>
//         </Link>
//       </div>
//     </div>
//   );
// }
